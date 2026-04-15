// --- Mocks for Chrome APIs ---

// A simple in-memory storage for chrome.storage.sync
const storage = {};

// A simple in-memory storage for chrome.storage.session
const sessionStorage = {};

// Track messages sent via chrome.runtime.sendMessage for assertions
const sentMessages = [];

// Mock implementation of the chrome APIs used by background.js
window.chrome = {
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
    sendMessage: (message, _callback) => {
      sentMessages.push(message);
      // Basic mock — catch called as Promise.catch in stop()
      return Promise.resolve();
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
    },
    session: {
      get: (keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (sessionStorage[key] !== undefined) {
              result[key] = sessionStorage[key];
            }
          });
        } else {
          for (const key in keys) {
            if (sessionStorage[key] !== undefined) {
              result[key] = sessionStorage[key];
            }
          }
        }
        callback(result);
      },
      set: (items, _callback) => {
        Object.assign(sessionStorage, items);
      },
      clear: () => {
        for (const key in sessionStorage) {
          delete sessionStorage[key];
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
    getVoices: (callback) => {
      if (chrome.tts.getVoicesMock) {
        chrome.tts.getVoicesMock(callback);
      } else {
        // Default mock behavior
        callback([
          { voiceName: 'Mock Voice 1', lang: 'en-US' },
          { voiceName: 'Mock Voice 2', lang: 'en-GB' }
        ]);
      }
    },
    // --- Test-specific state ---
    isSpeaking: false,
    wasPaused: false,
    wasResumed: false,
    wasStopped: false,
    lastSpokenText: null,
    lastOptions: null,
    getVoicesMock: null,
    // Helper to reset state between tests
    reset: () => {
        chrome.tts.isSpeaking = false;
        chrome.tts.wasPaused = false;
        chrome.tts.wasResumed = false;
        chrome.tts.wasStopped = false;
        chrome.tts.lastSpokenText = null;
        chrome.tts.lastOptions = null;
        chrome.tts.getVoicesMock = null;
    }
  },
  tabs: {
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      sendMessage: (tabId, message, callback) => {
          if (chrome.tabs.sendMessageMock) {
              return chrome.tabs.sendMessageMock(tabId, message, callback);
          }
          if (callback) callback();
          return Promise.resolve();
      },
      sendMessageMock: null
  },
  scripting: {
      executeScript: (options, callback) => {
          if (callback) callback();
      }
  }
};

// Helper to reset sentMessages
window.resetSentMessages = () => {
  sentMessages.length = 0;
};

// Expose for test assertions
window.sentMessages = sentMessages;