// --- Mocks for Chrome APIs ---

// A simple in-memory storage for chrome.storage.sync
const storage = {};

// Mock implementation of the chrome APIs used by background.js
const chrome = {
  runtime: {
    onInstalled: {
      addListener: (callback) => {
        // Immediately invoke the callback to simulate installation
        callback();
      }
    },
    onMessage: {
      listeners: [],
      addListener: (listener) => {
        chrome.runtime.onMessage.listeners.push(listener);
      },
      // Helper to simulate a message from a content script or popup
      sendMessage: (message) => {
        chrome.runtime.onMessage.listeners.forEach(listener => {
          listener(message, {}, () => {});
        });
      }
    },
    lastError: null
  },
  commands: {
    onCommand: {
      listeners: [],
      addListener: (listener) => {
        chrome.commands.onCommand.listeners.push(listener);
      },
      // Helper to simulate a command being triggered
      sendCommand: (command) => {
        chrome.commands.onCommand.listeners.forEach(listener => listener(command));
      }
    }
  },
  storage: {
    sync: {
      get: (keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (storage[key] !== undefined) {
              result[key] = storage[key];
            }
          });
        } else { // Assuming keys is an object like { rate: 1 }
            for (const key in keys) {
                if (storage[key] !== undefined) {
                    result[key] = storage[key];
                }
            }
        }
        callback(result);
      },
      set: (items, callback) => {
        Object.assign(storage, items);
        if (callback) {
          callback();
        }
      },
      // Helper to clear storage for tests
      clear: () => {
          for (const key in storage) {
              delete storage[key];
          }
      }
    }
  },
  tts: {
    speak: (text, options, callback) => {
      chrome.tts.isSpeaking = true;
      chrome.tts.lastSpokenText = text;
      chrome.tts.lastOptions = options;
      // Immediately call the callback to simulate speech start
      if (callback) {
        callback();
      }
    },
    pause: () => {
      chrome.tts.isSpeaking = false;
      chrome.tts.wasPaused = true;
    },
    resume: () => {
      chrome.tts.isSpeaking = true;
      chrome.tts.wasResumed = true;
    },
    stop: () => {
      chrome.tts.isSpeaking = false;
      chrome.tts.wasStopped = true;
    },
    // --- Test-specific state ---
    isSpeaking: false,
    wasPaused: false,
    wasResumed: false,
    wasStopped: false,
    lastSpokenText: null,
    lastOptions: null,
    // Helper to reset state between tests
    reset: () => {
        chrome.tts.isSpeaking = false;
        chrome.tts.wasPaused = false;
        chrome.tts.wasResumed = false;
        chrome.tts.wasStopped = false;
        chrome.tts.lastSpokenText = null;
        chrome.tts.lastOptions = null;
    }
  },
  tabs: {
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      sendMessage: () => {}
  }
};