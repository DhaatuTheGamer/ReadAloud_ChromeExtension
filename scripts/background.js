importScripts('utils.js');

// eslint-disable-next-line prefer-const -- intentionally `let` for test reassignment
let state = {
  text: '',
  chunks: [],
  chunkIndex: 0,
  playbackState: 'stopped', // 'stopped', 'playing', 'paused'
  rate: 1,
  voice: null,
  tabId: null
};

// --- Initialization ---

// Restore persisted settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['rate', 'voice'], (result) => {
    if (result.rate) state.rate = result.rate;
    if (result.voice) state.voice = result.voice;
  });
});

// Restore dynamic playback state from session storage on service worker startup.
// chrome.storage.session survives SW restarts but is cleared when the browser closes.
function restoreSessionState() {
  if (chrome.storage.session) {
    chrome.storage.session.get(['text', 'chunks', 'chunkIndex', 'playbackState', 'tabId'], (result) => {
      if (result && result.text) {
        state.text = result.text;
        state.chunks = result.chunks || [];
        state.chunkIndex = result.chunkIndex || 0;
        state.tabId = result.tabId || null;
        // If it was playing before SW died, mark as paused so user can resume
        if (result.playbackState === 'playing') {
          state.playbackState = 'paused';
        } else {
          state.playbackState = result.playbackState || 'stopped';
        }
      }
    });
  }
}

restoreSessionState();

/**
 * Persists the dynamic playback state to chrome.storage.session so it survives
 * service worker termination (MV3 workers can be killed after ~30s of inactivity).
 */
function saveSessionState() {
  if (chrome.storage.session) {
    chrome.storage.session.set({
      text: state.text,
      chunks: state.chunks,
      chunkIndex: state.chunkIndex,
      playbackState: state.playbackState,
      tabId: state.tabId
    });
  }
}

// --- Core Logic ---

/**
 * Helper function to split a single long sentence into smaller chunks.
 * @param {string} sentence The long sentence to split.
 * @param {number} maxChunkSize The maximum allowed chunk size.
 * @returns {string[]} An array of sub-chunks.
 */
function splitLongSentence(sentence, maxChunkSize) {
  const chunks = [];
  let remainingSentence = sentence;
  while (remainingSentence.length > maxChunkSize) {
    let splitIndex = remainingSentence.lastIndexOf(' ', maxChunkSize);
    if (splitIndex === -1) splitIndex = maxChunkSize;
    chunks.push(remainingSentence.substring(0, splitIndex).trim());
    remainingSentence = remainingSentence.substring(splitIndex).trim();
  }
  if (remainingSentence.length > 0) {
    chunks.push(remainingSentence);
  }
  return chunks;
}

/**
 * Splits text into sentences using the Intl.Segmenter API for language-aware
 * segmentation. This correctly handles abbreviations like "Dr.", "U.S.A.", etc.
 * Falls back to a regex if Intl.Segmenter is unavailable.
 * @param {string} text The full text to segment into sentences.
 * @returns {string[]} An array of sentence strings.
 */
function segmentSentences(text) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined') {
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    const segments = segmenter.segment(text);
    return Array.from(segments, s => s.segment);
  }
  // Fallback: naive regex (for environments without Intl.Segmenter)
  return text.match(/[^.!?]+[.!?]*|[^.!?\s]+/g) || [];
}

/**
 * Splits text into chunks, prioritizing sentence boundaries for more natural speech.
 * Falls back to a max character limit if a sentence is too long.
 * @param {string} text The full text to be chunked.
 * @returns {string[]} An array of text chunks.
 */
function chunkText(text) {
  const maxChunkSize = 250; // A safe max chunk size for TTS engines
  const chunks = [];

  if (!text) return chunks;

  const sentences = segmentSentences(text);

  let currentChunkParts = [];
  let currentChunkLength = 0;

  for (const sentence of sentences) {
    if (currentChunkLength + sentence.length <= maxChunkSize) {
      currentChunkParts.push(sentence);
      currentChunkLength += sentence.length;
    } else {
      // If the current chunk is not empty, push it.
      if (currentChunkParts.length > 0) {
        chunks.push(currentChunkParts.join('').trim());
      }

      // If the sentence itself is too long, split it.
      if (sentence.length > maxChunkSize) {
        const subChunks = splitLongSentence(sentence, maxChunkSize);
        if (subChunks.length > 0) {
          const lastSubChunk = subChunks.pop();
          chunks.push(...subChunks);
          currentChunkParts = [lastSubChunk];
          currentChunkLength = lastSubChunk.length;
        }
      } else {
        // The new sentence becomes the start of the next chunk.
        currentChunkParts = [sentence];
        currentChunkLength = sentence.length;
      }
    }
  }
  // Add the last remaining chunk.
  if (currentChunkParts.length > 0) {
    const finalChunk = currentChunkParts.join('').trim();
    if (finalChunk) {
      chunks.push(finalChunk);
    }
  }

  return chunks;
}

function speak() {
  // Guard against speaking if not in the 'playing' state or if chunks are exhausted.
  if (state.playbackState !== 'playing' || !state.chunks || state.chunkIndex >= state.chunks.length) {
    stop();
    return;
  }

  const chunk = state.chunks[state.chunkIndex];
  chrome.tts.speak(chunk, {
    rate: parseFloat(state.rate),
    voiceName: state.voice,
    onEvent: (event) => {
      if (event.type === 'end' || event.type === 'interrupted' || event.type === 'cancelled') {
        if (state.tabId) {
          chrome.tabs.sendMessage(state.tabId, { action: 'highlight', text: '' })
            .catch(err => console.error('Error sending highlight message:', err));
        }
        if (event.type === 'end' && state.playbackState === 'playing') {
          state.chunkIndex++;
          saveSessionState();
          speak();
        } else if (event.type !== 'end') {
          stop();
        }
      } else if (event.type === 'error') {
        console.error('TTS Error:', event.errorMessage);
        stop(); // Stop playback on error
      }
    }
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("TTS Error:", chrome.runtime.lastError.message);
      stop();
      return;
    }
    // After speaking starts, send message to highlight
    if (state.tabId) {
      chrome.tabs.sendMessage(state.tabId, { action: 'highlight', text: chunk })
        .catch(err => console.error('Error sending highlight message:', err));
    }
  });
}

function play(text) {
  // If new text is provided, or if we're starting from a fully stopped state,
  // reset and begin playback from the start.
  if (text) {
    state.text = text;
    state.chunks = chunkText(state.text);
    state.chunkIndex = 0;
  }

  state.playbackState = 'playing';
  saveSessionState();

  // Stop any currently ongoing speech before starting anew.
  chrome.tts.stop();
  speak();
}

function resume() {
  if (state.playbackState === 'paused') {
    state.playbackState = 'playing';
    saveSessionState();
    chrome.tts.resume();
  }
}

function pause() {
  if (state.playbackState === 'playing') {
    state.playbackState = 'paused';
    saveSessionState();
    chrome.tts.pause();
  }
}

function stop() {
  chrome.tts.stop();
  const wasStopped = state.playbackState !== 'stopped';
  state.playbackState = 'stopped';
  state.chunkIndex = 0;
  state.chunks = [];
  state.text = '';
  saveSessionState();

  // Notify the popup (if open) that playback has ended so it can update its UI
  if (wasStopped) {
    chrome.runtime.sendMessage({ action: 'playbackEnded' }).catch(() => {
      // Popup is not open — ignore the error
    });
  }
}

/**
 * Restarts playback if it's currently active.
 * Used after changing settings like rate or voice.
 */
function restartPlaybackIfPlaying() {
    if (state.playbackState === 'playing') {
        chrome.tts.stop();
        speak();
    }
}

/**
 * Skips forward by one sentence/chunk.
 */
function skipForward() {
  if (state.playbackState === 'playing' || state.playbackState === 'paused') {
    if (state.chunkIndex < state.chunks.length - 1) {
      state.chunkIndex++;
      saveSessionState();
      chrome.tts.stop();
      state.playbackState = 'playing';
      speak();
    }
  }
}

/**
 * Skips backward by one sentence/chunk.
 */
function skipBackward() {
  if (state.playbackState === 'playing' || state.playbackState === 'paused') {
    if (state.chunkIndex > 0) {
      state.chunkIndex--;
      saveSessionState();
      chrome.tts.stop();
      state.playbackState = 'playing';
      speak();
    }
  }
}

// --- Event Listeners ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'play':
      state.tabId = request.tabId;
      if (state.playbackState === 'paused') {
        resume();
      } else {
        play(request.text);
      }
      break;
    case 'pause':
      pause();
      break;
    case 'stop':
      stop();
      break;
    case 'getState':
      // No action, just send the current state back.
      break;
    case 'setRate':
      state.rate = request.rate;
      chrome.storage.sync.set({ rate: state.rate });
      restartPlaybackIfPlaying();
      break;
    case 'setVoice':
      state.voice = request.voice;
      chrome.storage.sync.set({ voice: state.voice });
      restartPlaybackIfPlaying();
      break;
  }
  sendResponse(state);
  return true; // Indicates an asynchronous response, which is good practice.
});

chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-play-pause':
      // Only act if we have a tabId to work with.
      if (!state.tabId) return;

      switch (state.playbackState) {
        case 'playing':
          pause();
          break;
        case 'paused':
          resume();
          break;
        case 'stopped':
          // Try to get text from the last active tab and play.
          injectAndGetText(state.tabId, (text) => {
              if (text) {
                  play(text);
              }
          });
          break;
      }
      break;
    case 'skip-forward':
      skipForward();
      break;
    case 'skip-backward':
      skipBackward();
      break;
  }
});

// Stop playback if the tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === state.tabId) {
        stop();
    }
});

// Stop playback if the user navigates to a new page in the same tab.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // The `changeInfo.url` check ensures this only triggers on URL changes.
    if (tabId === state.tabId && changeInfo.url) {
        stop();
    }
});