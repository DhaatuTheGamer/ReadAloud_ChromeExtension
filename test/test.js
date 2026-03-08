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

QUnit.module('Highlight Text Logic', (hooks) => {
  let originalScrollIntoView;

  hooks.beforeEach(() => {
    // Reset any previously highlighted element
    highlightText(null);

    // Mock scrollIntoView to avoid errors in test environment
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function() {
        this._scrolledIntoView = true;
    };

    // Setup DOM fixture
    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = `
      <div id="normal-text">This is normal text.</div>
      <script id="script-text">const a = "This is script text.";</script>
      <style id="style-text">.b { content: "This is style text."; }</style>
      <noscript id="noscript-text">This is noscript text.</noscript>
      <div id="nested-text"><span>This is nested text.</span></div>
    `;
  });

  hooks.afterEach(() => {
    // Restore original scrollIntoView
    Element.prototype.scrollIntoView = originalScrollIntoView;
    highlightText(null);
    document.getElementById('qunit-fixture').innerHTML = '';
  });

  QUnit.test('Should not highlight anything for empty, null, or undefined text', (assert) => {
    assert.expect(2);

    highlightText('');
    const normalDiv = document.getElementById('normal-text');
    assert.equal(normalDiv.style.backgroundColor, '', 'Empty string should not highlight');

    highlightText(null);
    assert.equal(normalDiv.style.backgroundColor, '', 'Null should not highlight');
  });

  QUnit.test('Should highlight normal text and scroll into view', (assert) => {
    assert.expect(2);

    highlightText('This is normal text.');
    const normalDiv = document.getElementById('normal-text');

    assert.equal(normalDiv.style.backgroundColor, 'yellow', 'Normal text element should have yellow background');
    assert.ok(normalDiv._scrolledIntoView, 'scrollIntoView should be called on the element');
  });

  QUnit.test('Should clear previous highlight when new text is highlighted', (assert) => {
    assert.expect(2);

    highlightText('This is normal text.');
    const normalDiv = document.getElementById('normal-text');
    assert.equal(normalDiv.style.backgroundColor, 'yellow', 'First element is highlighted');

    highlightText('This is nested text.');
    const nestedSpan = document.getElementById('nested-text').querySelector('span');

    assert.equal(normalDiv.style.backgroundColor, '', 'Previous highlight should be cleared');
  });

  QUnit.test('Should clear previous highlight when null or empty text is passed', (assert) => {
    assert.expect(2);

    highlightText('This is normal text.');
    const normalDiv = document.getElementById('normal-text');
    assert.equal(normalDiv.style.backgroundColor, 'yellow', 'First element is highlighted');

    highlightText(null);
    assert.equal(normalDiv.style.backgroundColor, '', 'Highlight should be cleared with null');
  });

  QUnit.test('Should ignore text inside SCRIPT, STYLE, and NOSCRIPT tags', (assert) => {
    assert.expect(3);

    highlightText('This is script text.');
    const scriptEl = document.getElementById('script-text');
    assert.notEqual(scriptEl.style.backgroundColor, 'yellow', 'Script tags should be ignored');

    highlightText('This is style text.');
    const styleEl = document.getElementById('style-text');
    assert.notEqual(styleEl.style.backgroundColor, 'yellow', 'Style tags should be ignored');

    highlightText('This is noscript text.');
    const noscriptEl = document.getElementById('noscript-text');
    assert.notEqual(noscriptEl.style.backgroundColor, 'yellow', 'Noscript tags should be ignored');
  });
});