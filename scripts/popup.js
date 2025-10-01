const playPauseButton = document.getElementById('play-pause');
const stopButton = document.getElementById('stop');
const rateInput = document.getElementById('rate');
const rateValueSpan = document.getElementById('rate-value'); // For displaying the speed value
const voicesSelect = document.getElementById('voices');

/**
 * Updates the entire popup UI based on the current playback state.
 * @param {object} state - The current state object from the background script.
 */
function updateUI(state) {
    // Update the speed slider and its text display
    rateInput.value = state.rate;
    if (rateValueSpan) {
        rateValueSpan.textContent = `${parseFloat(state.rate).toFixed(1)}x`;
    }

    // Update the voice dropdown
    if (state.voice) {
        // Ensure the voice list is populated before trying to set its value
        if (voicesSelect.options.length > 0) {
            voicesSelect.value = state.voice;
        }
    }

    // Toggle the play/pause button text and state
    if (state.playbackState === 'playing') {
        playPauseButton.textContent = 'Pause';
        playPauseButton.classList.add('playing');
    } else {
        playPauseButton.textContent = 'Play';
        playPauseButton.classList.remove('playing');
    }
}

/**
 * Fetches and populates the voice dropdown list. Retries if the API is slow to respond.
 * @param {string | null} stateVoice - The currently selected voice name to pre-select.
 */
function populateVoiceListWithRetry(stateVoice) {
  return new Promise((resolve) => {
    let attempts = 0;
    function tryGetVoices() {
      chrome.tts.getVoices(voices => {
        // Retry if the voices array isn't ready yet
        if (!voices || voices.length === 0) {
          if (attempts < 5) {
            attempts++;
            setTimeout(tryGetVoices, 200);
            return;
          }
        }
        
        voicesSelect.innerHTML = ''; // Clear any existing options
        voices.forEach(voice => {
          const option = document.createElement('option');
          option.textContent = `${voice.voiceName} (${voice.lang})`;
          option.value = voice.voiceName;
          voicesSelect.appendChild(option);
        });

        // Select the stored voice if available, otherwise default to the first voice
        if (stateVoice) {
          const found = Array.from(voicesSelect.options).find(opt => opt.value === stateVoice);
          voicesSelect.value = found ? stateVoice : (voicesSelect.options[0]?.value || '');
        } else {
          voicesSelect.value = voicesSelect.options[0]?.value || '';
        }
        resolve();
      });
    }
    tryGetVoices();
  });
}

// --- Event Listeners ---

playPauseButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
        if (state.playbackState === 'playing') {
            chrome.runtime.sendMessage({ action: 'pause' }, updateUI);
        } else if (state.playbackState === 'paused') {
            chrome.runtime.sendMessage({ action: 'play' }, updateUI); // Resume
        } else { // 'stopped'
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs[0].id;
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['scripts/content.js'],
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
                        return;
                    }
                    chrome.tabs.sendMessage(tabId, { action: "getText" }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error(`Message sending failed: ${chrome.runtime.lastError.message}`);
                            return;
                        }
                        if (response && response.text) {
                            chrome.runtime.sendMessage({ action: 'play', text: response.text, tabId: tabId }, updateUI);
                        }
                    });
                });
            });
        }
    });
});

stopButton.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stop' }, (newState) => {
    updateUI(newState);
  });
});

// This listener provides a real-time update to the speed display as the user drags the slider.
rateInput.addEventListener('input', (e) => {
  if (rateValueSpan) {
    rateValueSpan.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
  }
});

// This listener sends the final value to the background script only when the user releases the slider.
// This prevents spamming the background script with messages.
rateInput.addEventListener('change', (e) => {
  chrome.runtime.sendMessage({ action: 'setRate', rate: e.target.value });
});

voicesSelect.addEventListener('change', (e) => {
  chrome.runtime.sendMessage({ action: 'setVoice', voice: e.target.value });
});

// --- Initial Popup Setup ---
document.addEventListener('DOMContentLoaded', () => {
  // Get the current state from the background script to initialize the UI
  chrome.runtime.sendMessage({ action: 'getState' }, async (state) => {
    if (state) {
        // It's important to populate the voices list first
        await populateVoiceListWithRetry(state.voice);
        // Then, update the entire UI with the current state
        updateUI(state);
        
        // On first run, if no voice is saved yet, save the default one
        if (!state.voice && voicesSelect.options.length > 0) {
            chrome.runtime.sendMessage({ action: 'setVoice', voice: voicesSelect.value });
        }
    } else {
        console.error("Could not get state from background script.");
    }
  });
});