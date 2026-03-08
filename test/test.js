QUnit.module('Playback Logic', (hooks) => {
  // Before each test, reset the state of our mocks
  hooks.beforeEach(() => {
    // Reset the background script's internal state
    state = {
      text: '',
      chunks: [],
      chunkIndex: 0,
      playbackState: 'stopped',
      rate: 1,
      voice: null,
      tabId: null
    };
    // Reset the chrome API mocks
    chrome.tts.reset();
    chrome.storage.sync.clear();
  });

  QUnit.test('Initial play should start speech', (assert) => {
    assert.expect(3);

    // Simulate a message from the popup to play text
    chrome.runtime.onMessage.sendMessage({
      action: 'play',
      text: 'Hello world.',
      tabId: 1
    });

    assert.equal(state.playbackState, 'playing', 'Playback state should be "playing"');
    assert.ok(chrome.tts.isSpeaking, 'chrome.tts.speak should have been called');
    assert.equal(chrome.tts.lastSpokenText, 'Hello world.', 'The correct text should be spoken');
  });

  QUnit.test('Pause should pause speech', (assert) => {
    assert.expect(3);

    // First, start playing
    chrome.runtime.onMessage.sendMessage({ action: 'play', text: 'Hello world.', tabId: 1 });

    // Now, simulate a pause message
    chrome.runtime.onMessage.sendMessage({ action: 'pause' });

    assert.equal(state.playbackState, 'paused', 'Playback state should be "paused"');
    assert.notOk(chrome.tts.isSpeaking, 'TTS should no longer be in the speaking state');
    assert.ok(chrome.tts.wasPaused, 'chrome.tts.pause() should have been called');
  });

  QUnit.test('Stop should stop speech and reset state', (assert) => {
    assert.expect(4);

    // Start playing
    chrome.runtime.onMessage.sendMessage({ action: 'play', text: 'Some text to read.', tabId: 1 });

    // Send stop message
    chrome.runtime.onMessage.sendMessage({ action: 'stop' });

    assert.equal(state.playbackState, 'stopped', 'Playback state should be "stopped"');
    assert.deepEqual(state.chunks, [], 'Chunks should be cleared');
    assert.equal(state.chunkIndex, 0, 'Chunk index should be reset');
    assert.ok(chrome.tts.wasStopped, 'chrome.tts.stop() should have been called');
  });

  QUnit.test('BUG FIX: Play after pause should resume, not restart', (assert) => {
    assert.expect(4);

    // 1. Play
    chrome.runtime.onMessage.sendMessage({ action: 'play', text: 'This is a test sentence.', tabId: 1 });
    const originalSpokenText = chrome.tts.lastSpokenText;
    chrome.tts.lastSpokenText = null; // Reset for the next check

    // 2. Pause
    chrome.runtime.onMessage.sendMessage({ action: 'pause' });

    // 3. Play again (should resume)
    chrome.runtime.onMessage.sendMessage({ action: 'play', tabId: 1 });

    assert.equal(state.playbackState, 'playing', 'Playback state should be "playing" again');
    assert.ok(chrome.tts.wasResumed, 'chrome.tts.resume() should have been called');
    assert.ok(chrome.tts.isSpeaking, 'TTS should be in the speaking state');
    assert.notOk(chrome.tts.lastSpokenText, 'chrome.tts.speak() should NOT have been called again');
  });

  QUnit.test('Keyboard shortcut should toggle play, pause, and resume', (assert) => {
    assert.expect(5);

    // Start with a known tabId
    state.tabId = 1;

    // 1. Toggle from stopped to playing
    chrome.commands.onCommand.sendCommand('toggle-play-pause');
    // In a real scenario, this would trigger content script, for here we manually play
    chrome.runtime.onMessage.sendMessage({ action: 'play', text: 'Shortcut test', tabId: 1 });
    assert.equal(state.playbackState, 'playing', 'State is "playing" after first toggle');

    // 2. Toggle from playing to paused
    chrome.commands.onCommand.sendCommand('toggle-play-pause');
    assert.equal(state.playbackState, 'paused', 'State is "paused" after second toggle');
    assert.ok(chrome.tts.wasPaused, 'chrome.tts.pause() was called');

    // 3. Toggle from paused to playing (resume)
    chrome.commands.onCommand.sendCommand('toggle-play-pause');
    assert.equal(state.playbackState, 'playing', 'State is "playing" again after third toggle');
    assert.ok(chrome.tts.wasResumed, 'chrome.tts.resume() was called');
  });
});

QUnit.module('Popup Logic', (hooks) => {
  hooks.beforeEach(() => {
    chrome.tts.reset();
    document.getElementById('voices').innerHTML = '';
  });

  QUnit.test('populateVoiceListWithRetry populates dropdown immediately when voices are available', (assert) => {
    assert.expect(2);

    chrome.tts.mockGetVoicesOptions = {
      voices: [
        { voiceName: 'Alex', lang: 'en-US' },
        { voiceName: 'Victoria', lang: 'en-US' }
      ]
    };

    const done = assert.async();

    window.populateVoiceListWithRetry().then(() => {
      const voicesSelect = document.getElementById('voices');
      assert.equal(voicesSelect.options.length, 2, 'Dropdown should have 2 options');
      if (voicesSelect.options.length > 0) {
          assert.equal(voicesSelect.options[0].textContent, 'Alex (en-US)', 'First option should match expected text');
      } else {
          assert.ok(false, 'No options added to select');
      }
      done();
    });
  });

  QUnit.test('populateVoiceListWithRetry retries until voices are available', (assert) => {
    assert.expect(2);

    chrome.tts.mockGetVoicesOptions = {
      delayCalls: 2, // Return empty array 2 times before returning voices
      voices: [
        { voiceName: 'Fred', lang: 'en-US' }
      ]
    };

    const done = assert.async();

    window.populateVoiceListWithRetry().then(() => {
      const voicesSelect = document.getElementById('voices');
      assert.equal(voicesSelect.options.length, 1, 'Dropdown should be populated after retries');
      if (voicesSelect.options.length > 0) {
          assert.equal(voicesSelect.options[0].textContent, 'Fred (en-US)', 'Option should match expected text');
      } else {
          assert.ok(false, 'No options added to select');
      }
      done();
    });
  });

  QUnit.test('populateVoiceListWithRetry pre-selects the requested voice', (assert) => {
    assert.expect(1);

    chrome.tts.mockGetVoicesOptions = {
      voices: [
        { voiceName: 'Alex', lang: 'en-US' },
        { voiceName: 'Victoria', lang: 'en-US' },
        { voiceName: 'Fred', lang: 'en-US' }
      ]
    };

    const done = assert.async();

    window.populateVoiceListWithRetry('Victoria').then(() => {
      const voicesSelect = document.getElementById('voices');
      assert.equal(voicesSelect.value, 'Victoria', 'Requested voice should be pre-selected');
      done();
    });
  });
});