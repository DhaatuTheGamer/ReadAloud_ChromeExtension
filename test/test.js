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

  QUnit.test('restartPlaybackIfPlaying should restart speech if playing', (assert) => {
    assert.expect(2);
    state.playbackState = 'playing';
    state.chunks = ['Test chunk'];
    state.chunkIndex = 0;

    restartPlaybackIfPlaying();

    assert.ok(chrome.tts.wasStopped, 'chrome.tts.stop() should have been called');
    assert.ok(chrome.tts.isSpeaking, 'speak() should have been called and started TTS');
  });

  QUnit.test('restartPlaybackIfPlaying should NOT restart speech if not playing', (assert) => {
    assert.expect(2);
    state.playbackState = 'stopped';

    restartPlaybackIfPlaying();

    assert.notOk(chrome.tts.wasStopped, 'chrome.tts.stop() should NOT have been called');
    assert.notOk(chrome.tts.isSpeaking, 'speak() should NOT have been called');
  });
});

QUnit.module('Text Chunking', () => {
  QUnit.test('Empty text should return empty array', (assert) => {
    assert.deepEqual(chunkText(''), [], 'Empty string results in no chunks');
    assert.deepEqual(chunkText(null), [], 'Null text results in no chunks');
    assert.deepEqual(chunkText(undefined), [], 'Undefined text results in no chunks');
  });

  QUnit.test('Single short sentence should not be split', (assert) => {
    const text = 'Hello world.';
    assert.deepEqual(chunkText(text), [text], 'Short sentence is one chunk');
  });

  QUnit.test('Multiple short sentences should stay together if under maxChunkSize', (assert) => {
    const text = 'Sentence one. Sentence two? Sentence three!';
    assert.deepEqual(chunkText(text), [text], 'Multiple short sentences are kept together');
  });

  QUnit.test('Should split at sentence boundaries when exceeding maxChunkSize', (assert) => {
    // 250 is maxChunkSize
    const s1 = 'A'.repeat(200) + '. '; // 202 chars
    const s2 = 'B'.repeat(100) + '.';   // 101 chars
    const text = s1 + s2;
    const result = chunkText(text);
    assert.equal(result.length, 2, 'Should split into two chunks');
    assert.equal(result[0], s1.trim(), 'First chunk should be the first sentence');
    assert.equal(result[1], s2, 'Second chunk should be the second sentence');
  });

  QUnit.test('Should handle text without sentence punctuation', (assert) => {
    const text = 'This is a long text without any punctuation but it has some spaces in it';
    const result = chunkText(text);
    // Even without punctuation, the current regex [^.!?\s]+ treats words as "sentences" of sorts.
    // Let's check how it behaves.
    assert.ok(result.length > 0, 'Should return at least one chunk');
    assert.equal(result.join(' '), text, 'Recombining chunks (with spaces) should match original text');
  });

  QUnit.test('Sentence longer than maxChunkSize should be split', (assert) => {
    // Sentence with 300 characters should be split at a space near 250
    const longSentence = 'A'.repeat(240) + ' ' + 'B'.repeat(60) + '.';
    const result = chunkText(longSentence);
    assert.equal(result.length, 2, 'Should be split into two chunks');
    assert.equal(result[0], 'A'.repeat(240), 'First chunk should be split at space');
    assert.equal(result[1], 'B'.repeat(60) + '.', 'Second chunk should contain the rest');
  });

  QUnit.test('Sentence longer than maxChunkSize without spaces should be split at the limit', (assert) => {
    const veryLongSentence = 'C'.repeat(300);
    const result = chunkText(veryLongSentence);
    assert.equal(result.length, 2, 'Should be split into two chunks even without spaces');
    assert.equal(result[0].length, 250, 'First chunk should be exactly maxChunkSize');
    assert.equal(result[1].length, 50, 'Second chunk should contain the remaining characters');
  });

  QUnit.test('Mixed punctuation and extra spaces', (assert) => {
    const text = 'Hello!   How are you? I am fine... Great.';
    const result = chunkText(text);
    // Current implementation preserves spaces between sentences.
    assert.deepEqual(result, ['Hello!   How are you? I am fine... Great.'], 'Current behavior preserves intra-chunk spaces');
  });
});

QUnit.module('Content Script Highlighting', (hooks) => {
  let originalScrollIntoView;

  hooks.beforeEach(() => {
    // Add elements outside qunit-fixture to avoid detaching problems
    const fixture = document.getElementById('qunit-fixture');
    const content = document.createElement('div');
    content.id = 'highlight-content';
    content.innerHTML = '<p>This is some test text to highlight.</p>';
    fixture.appendChild(content);

    // Mock Element.prototype.scrollIntoView to avoid errors in headless mode
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = () => {};
  });

  hooks.afterEach(() => {
    // Restore scrollIntoView
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  QUnit.test('highlightText should catch and log errors from document.evaluate', (assert) => {
    assert.expect(1);

    // Mock document.evaluate to throw an error
    const originalEvaluate = document.evaluate;
    document.evaluate = () => {
      throw new Error('Simulated XPath error');
    };

    // Mock console.error
    const originalConsoleError = console.error;
    let consoleErrorCalled = false;
    console.error = (msg, err) => {
      if (msg === 'Highlight search failed' && err.message === 'Simulated XPath error') {
        consoleErrorCalled = true;
      }
    };

    try {
      // This should not crash
      window.highlightText('test text');
      assert.ok(consoleErrorCalled, 'console.error was called with the correct message and error');
    } finally {
      // Restore mocks
      document.evaluate = originalEvaluate;
      console.error = originalConsoleError;
    }
  });
});