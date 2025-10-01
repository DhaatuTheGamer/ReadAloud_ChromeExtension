// --- START OF FULLY MODIFIED FILE background.js ---

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
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['rate', 'voice'], (result) => {
    if (result.rate) state.rate = result.rate;
    if (result.voice) state.voice = result.voice;
  });
});

// --- Core Logic ---

/**
 * Splits text into chunks, prioritizing sentence boundaries for more natural speech.
 * Falls back to a max character limit if a sentence is too long.
 * @param {string} text The full text to be chunked.
 * @returns {string[]} An array of text chunks.
 */
function chunkText(text) {
  const maxChunkSize = 250; // A safe max chunk size for TTS engines
  // Regex to split text into sentences, preserving punctuation.
  const sentences = text.match(/[^.!?]+[.!?]*|[^.!?\s]+/g) || [];
  const chunks = [];

  if (!text) return chunks;

  let currentChunk = '';
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      // If the current chunk is not empty, push it.
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      // The new sentence becomes the start of the next chunk.
      currentChunk = sentence;
    }
  }
  // Add the last remaining chunk.
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
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
          chrome.tabs.sendMessage(state.tabId, { action: 'highlight', text: '' }).catch(e => console.error(e));
        }
        if (event.type === 'end' && state.playbackState === 'playing') {
          state.chunkIndex++;
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
      chrome.tabs.sendMessage(state.tabId, { action: 'highlight', text: chunk }).catch(e => console.error(e));
    }
  });
}

function play(text) {
  state.playbackState = 'playing';

  // If we are currently paused, just resume.
  if (state.playbackState === 'paused') {
    chrome.tts.resume();
    sendResponse(state);
    return;
  }

  // If new text is provided, or if we're starting from a fully stopped state,
  // reset and begin playback from the start.
  if (text) {
    state.text = text;
    state.chunks = chunkText(state.text);
    state.chunkIndex = 0;
  }

  // Stop any currently ongoing speech before starting anew.
  chrome.tts.stop();
  speak();
}

function pause() {
  if (state.playbackState === 'playing') {
    chrome.tts.pause();
    state.playbackState = 'paused';
  }
}

function stop() {
  chrome.tts.stop();
  state.playbackState = 'stopped';
  state.chunkIndex = 0;
  state.chunks = [];
  // Keep tabId for potential restart via shortcut, but clear text.
  state.text = ''; 
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

// --- Event Listeners ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'play':
      state.tabId = request.tabId;
      play(request.text);
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
  if (command === 'toggle-play-pause') {
    // Only act if we have a tabId to work with.
    if (!state.tabId) return;

    switch (state.playbackState) {
      case 'playing':
        pause();
        break;
      case 'paused':
        play(); // Resume with existing text.
        break;
      case 'stopped':
        // Try to get text from the last active tab and play.
        chrome.scripting.executeScript({
            target: { tabId: state.tabId },
            files: ['scripts/content.js'],
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Script injection failed:", chrome.runtime.lastError.message);
                return;
            }
            chrome.tabs.sendMessage(state.tabId, { action: "getText" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Message sending failed:", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.text) {
                    play(response.text);
                }
            });
        });
        break;
    }
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