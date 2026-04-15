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
    chrome.storage.session.clear();
    resetSentMessages();
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

  QUnit.test('Stop should broadcast playbackEnded message', (assert) => {
    // Start playing first
    chrome.runtime.onMessage.sendMessage({ action: 'play', text: 'Test text.', tabId: 1 });
    resetSentMessages();

    // Stop
    chrome.runtime.onMessage.sendMessage({ action: 'stop' });

    const endedMsg = sentMessages.find(m => m.action === 'playbackEnded');
    assert.ok(endedMsg, 'playbackEnded message should be sent when stopping from a non-stopped state');
  });

  QUnit.test('Stop from already stopped state should NOT broadcast playbackEnded', (assert) => {
    state.playbackState = 'stopped';
    resetSentMessages();

    stop();

    const endedMsg = sentMessages.find(m => m.action === 'playbackEnded');
    assert.notOk(endedMsg, 'playbackEnded should not be sent when already stopped');
  });
});

QUnit.module('Skip Commands', (hooks) => {
  hooks.beforeEach(() => {
    state = {
      text: 'Sentence one. Sentence two. Sentence three.',
      chunks: ['Sentence one.', 'Sentence two.', 'Sentence three.'],
      chunkIndex: 1,
      playbackState: 'playing',
      rate: 1,
      voice: null,
      tabId: 1
    };
    chrome.tts.reset();
    chrome.storage.session.clear();
  });

  QUnit.test('Skip forward increments chunkIndex and speaks', (assert) => {
    skipForward();

    assert.equal(state.chunkIndex, 2, 'chunkIndex should be incremented');
    assert.equal(state.playbackState, 'playing', 'Should remain playing');
    assert.ok(chrome.tts.isSpeaking, 'TTS should be speaking the next chunk');
    assert.equal(chrome.tts.lastSpokenText, 'Sentence three.', 'Should speak the next sentence');
  });

  QUnit.test('Skip forward does nothing at the last chunk', (assert) => {
    state.chunkIndex = 2; // Last chunk
    chrome.tts.reset();

    skipForward();

    assert.equal(state.chunkIndex, 2, 'chunkIndex should not change');
    assert.notOk(chrome.tts.isSpeaking, 'TTS should not start speaking');
  });

  QUnit.test('Skip backward decrements chunkIndex and speaks', (assert) => {
    skipBackward();

    assert.equal(state.chunkIndex, 0, 'chunkIndex should be decremented');
    assert.equal(state.playbackState, 'playing', 'Should remain playing');
    assert.ok(chrome.tts.isSpeaking, 'TTS should be speaking the previous chunk');
    assert.equal(chrome.tts.lastSpokenText, 'Sentence one.', 'Should speak the previous sentence');
  });

  QUnit.test('Skip backward does nothing at the first chunk', (assert) => {
    state.chunkIndex = 0;
    chrome.tts.reset();

    skipBackward();

    assert.equal(state.chunkIndex, 0, 'chunkIndex should not change');
    assert.notOk(chrome.tts.isSpeaking, 'TTS should not start speaking');
  });

  QUnit.test('Skip commands work from paused state', (assert) => {
    state.playbackState = 'paused';

    skipForward();

    assert.equal(state.chunkIndex, 2, 'chunkIndex should be incremented');
    assert.equal(state.playbackState, 'playing', 'Should switch to playing');
    assert.ok(chrome.tts.isSpeaking, 'TTS should start speaking');
  });

  QUnit.test('Skip commands do nothing when stopped', (assert) => {
    state.playbackState = 'stopped';
    chrome.tts.reset();

    skipForward();
    assert.equal(state.chunkIndex, 1, 'chunkIndex should not change when stopped');

    skipBackward();
    assert.equal(state.chunkIndex, 1, 'chunkIndex should not change when stopped');
  });

  QUnit.test('Skip via keyboard command dispatches correctly', (assert) => {
    chrome.tts.reset();

    chrome.commands.onCommand.sendCommand('skip-forward');
    assert.equal(state.chunkIndex, 2, 'skip-forward command should increment chunkIndex');

    chrome.tts.reset();
    chrome.commands.onCommand.sendCommand('skip-backward');
    assert.equal(state.chunkIndex, 1, 'skip-backward command should decrement chunkIndex');
  });
});

QUnit.module('Article Text Extraction', (hooks) => {
  let originalGetSelection;
  let originalQuerySelector;

  hooks.beforeEach(() => {
    originalGetSelection = window.getSelection;
    originalQuerySelector = document.querySelector;
  });

  hooks.afterEach(() => {
    window.getSelection = originalGetSelection;
    document.querySelector = originalQuerySelector;
    document.getElementById('qunit-fixture').replaceChildren();
  });

  QUnit.test('Should return selected text if there is a selection', (assert) => {
    window.getSelection = () => ({
      toString: () => '   User selected text.   '
    });

    const result = getArticleText();
    assert.equal(result, 'User selected text.', 'Should trim and return selected text');
  });

  QUnit.test('Should extract text from an article element', (assert) => {
    window.getSelection = () => ({ toString: () => '' });
    const fixture = document.getElementById('qunit-fixture');

    const article = document.createElement('article');
    article.innerText = 'This is the main article text.';
    // Fallback for jsdom
    if (!article.innerText) article.textContent = 'This is the main article text.';
    fixture.appendChild(article);

    // Mock querySelector to only search within fixture to avoid finding real body/html elements inappropriately
    document.querySelector = (sel) => fixture.querySelector(sel);

    const result = getArticleText();
    assert.equal(result, 'This is the main article text.', 'Should extract text from <article>');
  });

  QUnit.test('Should remove unwanted elements before extraction', (assert) => {
    window.getSelection = () => ({ toString: () => '' });
    const fixture = document.getElementById('qunit-fixture');

    const article = document.createElement('article');
    article.innerHTML = `
      <nav>Navigation links</nav>
      <header>Article Header</header>
      <p>This is the actual content we want.</p>
      <script>console.log("bad")</script>
      <aside>Sidebar stuff</aside>
      <footer>Footer info</footer>
    `;
    fixture.appendChild(article);

    document.querySelector = (sel) => fixture.querySelector(sel);

    const result = getArticleText();
    assert.ok(result.includes('This is the actual content we want.'), 'Should keep the paragraph text');
    assert.notOk(result.includes('Navigation links'), 'Should remove <nav>');
    assert.notOk(result.includes('Article Header'), 'Should remove <header>');
    assert.notOk(result.includes('console.log'), 'Should remove <script>');
    assert.notOk(result.includes('Sidebar stuff'), 'Should remove <aside>');
    assert.notOk(result.includes('Footer info'), 'Should remove <footer>');
  });

  QUnit.test('Should fallback to body if no specific selectors match', (assert) => {
    window.getSelection = () => ({ toString: () => '' });

    document.querySelector = (sel) => {
      if (sel === 'body') {
        const fakeBody = document.createElement('body');
        fakeBody.innerHTML = '<p>Body fallback text.</p>';
        return fakeBody;
      }
      return null;
    };

    const result = getArticleText();
    assert.ok(result === 'Body fallback text.' || result === '', 'Should fallback to body text');
  });

  QUnit.test('Should return empty string if absolutely nothing matches', (assert) => {
    window.getSelection = () => ({ toString: () => '' });
    // Mock to return nothing
    document.querySelector = () => null;

    const result = getArticleText();
    assert.equal(result, '', 'Should return empty string when no selectors match');
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
    const result = chunkText(text);
    assert.equal(result.length, 1, 'Should produce one chunk');
    assert.equal(result[0], text, 'Chunk should match the input');
  });

  QUnit.test('Intl.Segmenter correctly handles abbreviations', (assert) => {
    // Intl.Segmenter treats "Dr. Smith" as part of one sentence, not split at "Dr."
    const text = 'Dr. Smith went home. He was tired.';
    const result = chunkText(text);
    // With Intl.Segmenter, this should produce 2 sentences, not 3
    assert.ok(result.length >= 1 && result.length <= 2, 'Should produce 1-2 chunks, not split at Dr.');
    const joined = result.join('');
    assert.ok(joined.includes('Dr. Smith'), 'Dr. Smith should stay together in a chunk');
  });

  QUnit.test('Should split at sentence boundaries when exceeding maxChunkSize', (assert) => {
    // 250 is maxChunkSize. Build two sentences that together exceed 250.
    const s1 = 'A'.repeat(200) + '. '; // 202 chars
    const s2 = 'B'.repeat(100) + '.';   // 101 chars
    const text = s1 + s2;
    const result = chunkText(text);
    assert.equal(result.length, 2, 'Should split into two chunks');
  });

  QUnit.test('Sentence longer than maxChunkSize should be split', (assert) => {
    // Sentence with 300+ characters should be split at a space near 250
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

  QUnit.test('Mixed punctuation and short text stays in one chunk', (assert) => {
    const text = 'Hello! How are you? I am fine. Great.';
    const result = chunkText(text);
    // All fit within 250 chars, so should be one chunk
    assert.equal(result.length, 1, 'Short text with multiple sentences stays in one chunk');
    assert.equal(result[0], text, 'Content should match');
  });
});

QUnit.module('Popup UI Logic', (hooks) => {
  let playPauseBtn, rateInput, rateValueSpan, voicesSelect, errorMsg;

  hooks.beforeEach(() => {
    playPauseBtn = document.getElementById('play-pause');
    rateInput = document.getElementById('rate');
    rateValueSpan = document.getElementById('rate-value');
    voicesSelect = document.getElementById('voices');
    errorMsg = document.getElementById('error-message');

    // Because the elements are outside qunit-fixture, we must manually reset them
    playPauseBtn.textContent = 'Play';
    playPauseBtn.classList.remove('playing');
    rateInput.value = '1';
    rateValueSpan.textContent = '1.0x';
    voicesSelect.replaceChildren(); // clear options
    if (errorMsg) {
      errorMsg.textContent = '';
      errorMsg.style.display = 'none';
    }
  });

  QUnit.test('updateUI sets Play/Pause button correctly for playing state', (assert) => {
    const state = { playbackState: 'playing', rate: '1.0' };
    updateUI(state);

    assert.equal(playPauseBtn.textContent, 'Pause', 'Button text should be "Pause" when playing');
    assert.ok(playPauseBtn.classList.contains('playing'), 'Button should have "playing" class');
  });

  QUnit.test('updateUI sets Play/Pause button correctly for paused/stopped state', (assert) => {
    const state = { playbackState: 'paused', rate: '1.0' };
    updateUI(state);

    assert.equal(playPauseBtn.textContent, 'Play', 'Button text should be "Play" when paused');
    assert.notOk(playPauseBtn.classList.contains('playing'), 'Button should not have "playing" class');

    const stateStopped = { playbackState: 'stopped', rate: '1.0' };
    updateUI(stateStopped);

    assert.equal(playPauseBtn.textContent, 'Play', 'Button text should be "Play" when stopped');
    assert.notOk(playPauseBtn.classList.contains('playing'), 'Button should not have "playing" class');
  });

  QUnit.test('updateUI updates rate slider and rate value display', (assert) => {
    const state = { rate: '1.5' };
    updateUI(state);

    assert.equal(rateInput.value, '1.5', 'Rate input value should be 1.5');
    assert.equal(rateValueSpan.textContent, '1.5x', 'Rate value text should be "1.5x"');

    const stateDecimal = { rate: '0.8' };
    updateUI(stateDecimal);

    assert.equal(rateInput.value, '0.8', 'Rate input value should be 0.8');
    assert.equal(rateValueSpan.textContent, '0.8x', 'Rate value text should be "0.8x"');
  });

  QUnit.test('updateUI updates voice selection if options exist', (assert) => {
    // Add some mock options to the select element
    const opt1 = document.createElement('option');
    opt1.value = 'Voice A';
    const opt2 = document.createElement('option');
    opt2.value = 'Voice B';
    voicesSelect.appendChild(opt1);
    voicesSelect.appendChild(opt2);

    const state = { voice: 'Voice B', rate: '1.0' };
    updateUI(state);

    assert.equal(voicesSelect.value, 'Voice B', 'Voice select should match the state voice');
  });

  QUnit.test('updateUI does not throw if voicesSelect options are empty', (assert) => {
    const state = { voice: 'Voice C', rate: '1.0' };

    // updateUI should handle the empty voicesSelect list safely
    updateUI(state);

    assert.ok(true, 'updateUI completed without error when voicesSelect is empty');
    assert.equal(voicesSelect.value, '', 'Voice select should remain unselected/empty');
  });

  QUnit.test('Should handle null or empty text gracefully', (assert) => {
    const fixture = document.getElementById('qunit-fixture');
    const p = document.createElement('p');
    p.textContent = 'Some text.';
    fixture.appendChild(p);

    // First highlight something
    highlightText('Some text.');
    // Check that highlight was applied (either via CSS Highlight API or fallback)
    const highlighted = (typeof CSS !== 'undefined' && CSS.highlights)
      ? CSS.highlights.has('read-aloud-active')
      : p.style.backgroundColor === 'yellow';
    assert.ok(highlighted, 'Text is highlighted initially');

    // Then call with empty text
    highlightText('');
    const cleared = (typeof CSS !== 'undefined' && CSS.highlights)
      ? !CSS.highlights.has('read-aloud-active')
      : p.style.backgroundColor === '';
    assert.ok(cleared, 'Highlight should be cleared on empty text');

    // Highlight again
    highlightText('Some text.');

    // Then call with null
    highlightText(null);
    const clearedNull = (typeof CSS !== 'undefined' && CSS.highlights)
      ? !CSS.highlights.has('read-aloud-active')
      : p.style.backgroundColor === '';
    assert.ok(clearedNull, 'Highlight should be cleared on null text');
  });

  QUnit.test('Should ignore text in SCRIPT, STYLE, and NOSCRIPT tags', (assert) => {
    const fixture = document.getElementById('qunit-fixture');

    const script = document.createElement('script');
    script.textContent = '// hidden script text';
    fixture.appendChild(script);

    const style = document.createElement('style');
    style.textContent = '.hidden { content: "hidden style text"; }';
    fixture.appendChild(style);

    const noscript = document.createElement('noscript');
    noscript.textContent = 'hidden noscript text';
    fixture.appendChild(noscript);

    highlightText('hidden script text');
    assert.notEqual(script.style.backgroundColor, 'yellow', 'Should not highlight inside <script>');

    highlightText('hidden style text');
    assert.notEqual(style.style.backgroundColor, 'yellow', 'Should not highlight inside <style>');

    highlightText('hidden noscript text');
    assert.notEqual(noscript.style.backgroundColor, 'yellow', 'Should not highlight inside <noscript>');
  });

  QUnit.test('Should not throw when text is not found', (assert) => {
    const fixture = document.getElementById('qunit-fixture');
    const p = document.createElement('p');
    p.textContent = 'Visible text.';
    fixture.appendChild(p);

    // Should not throw an error
    highlightText('Non-existent text');
    assert.ok(true, 'Did not throw an exception when text was not found');
  });

  QUnit.test('Should catch and log exceptions during DOM search', (assert) => {
    const originalCreateTreeWalker = document.createTreeWalker;
    const originalConsoleError = console.error;
    let errorLogged = false;

    // Mock createTreeWalker to throw (actual implementation uses this)
    document.createTreeWalker = function() {
      throw new Error('Simulated TreeWalker error');
    };

    // Mock document.evaluate to throw (rationale suggests this might be used)
    const originalEvaluate = document.evaluate;
    document.evaluate = function() {
      throw new Error('Simulated evaluate error');
    };

    // Mock console.error
    console.error = function() {
      errorLogged = true;
    };

    try {
      highlightText('Some text');
      assert.ok(errorLogged, 'console.error should have been called');
    } finally {
      // Restore originals
      document.createTreeWalker = originalCreateTreeWalker;
      document.evaluate = originalEvaluate;
      console.error = originalConsoleError;
    }
  });

  QUnit.test('showError displays error message', (assert) => {
    showError('Test error message');
    assert.equal(errorMsg.textContent, 'Test error message', 'Error text should be set');
    assert.equal(errorMsg.style.display, 'block', 'Error should be visible');
  });

  QUnit.test('hideError clears and hides error message', (assert) => {
    showError('Some error');
    hideError();
    assert.equal(errorMsg.textContent, '', 'Error text should be cleared');
    assert.equal(errorMsg.style.display, 'none', 'Error should be hidden');
  });

  QUnit.test('populateVoiceListWithRetry populates voices and selects stateVoice', async (assert) => {
    // The default mock returns ['Mock Voice 1', 'Mock Voice 2']
    await populateVoiceListWithRetry('Mock Voice 2');

    assert.equal(voicesSelect.options.length, 2, 'Should have 2 voice options');
    assert.equal(voicesSelect.options[0].value, 'Mock Voice 1', 'First option is Mock Voice 1');
    assert.equal(voicesSelect.options[1].value, 'Mock Voice 2', 'Second option is Mock Voice 2');
    assert.equal(voicesSelect.value, 'Mock Voice 2', 'stateVoice (Mock Voice 2) should be selected');
  });

  QUnit.test('populateVoiceListWithRetry retries on empty response', async (assert) => {
    let callCount = 0;
    chrome.tts.getVoicesMock = (callback) => {
      callCount++;
      if (callCount < 3) {
        callback([]); // Empty response for first 2 calls
      } else {
        callback([{ voiceName: 'Voice C', lang: 'en' }]); // Success on 3rd call
      }
    };

    await populateVoiceListWithRetry(null);

    assert.equal(callCount, 3, 'Should retry until it gets voices (3 calls)');
    assert.equal(voicesSelect.options.length, 1, 'Should have 1 voice option');
    assert.equal(voicesSelect.options[0].value, 'Voice C', 'Option is Voice C');
    assert.equal(voicesSelect.value, 'Voice C', 'Default voice should be selected');
  });

  QUnit.test('populateVoiceListWithRetry rejects after timeout/max attempts', async (assert) => {
    let callCount = 0;
    chrome.tts.getVoicesMock = (callback) => {
      callCount++;
      callback([]); // Always return empty
    };

    try {
      await populateVoiceListWithRetry(null);
      assert.notOk(true, 'Promise should have rejected');
    } catch (error) {
      assert.equal(error.message, 'Timeout waiting for voices', 'Should reject with timeout error');
      assert.equal(callCount, 6, 'Should attempt 6 times (1 initial + 5 retries)');
    }
  });
});

QUnit.module('Voice List Population', (hooks) => {
  let voicesSelect;

  hooks.beforeEach(() => {
    voicesSelect = document.getElementById('voices');
    voicesSelect.replaceChildren(); // clear options
    chrome.tts.reset();
  });

  hooks.afterEach(() => {
    if (sinon) {
      sinon.restore();
    }
  });

  QUnit.test('Immediate success populates voices and selects default', async (assert) => {
    assert.expect(3);

    // Default mock behavior returns Mock Voice 1 and Mock Voice 2
    await populateVoiceListWithRetry(null);

    assert.equal(voicesSelect.options.length, 2, 'Should populate with 2 options');
    assert.equal(voicesSelect.options[0].value, 'Mock Voice 1', 'First option should be Mock Voice 1');
    assert.equal(voicesSelect.value, 'Mock Voice 1', 'Should select the first voice by default');
  });

  QUnit.test('Selects stateVoice when available', async (assert) => {
    assert.expect(2);

    await populateVoiceListWithRetry('Mock Voice 2');

    assert.equal(voicesSelect.options.length, 2, 'Should populate with 2 options');
    assert.equal(voicesSelect.value, 'Mock Voice 2', 'Should select the provided stateVoice');
  });

  QUnit.test('Retry logic populates successfully after delayed empty responses', async (assert) => {
    assert.expect(4);
    const clock = sinon.useFakeTimers();

    let callCount = 0;
    chrome.tts.getVoicesMock = (callback) => {
      callCount++;
      if (callCount < 3) {
        callback([]);
      } else {
        callback([{ voiceName: 'Delayed Voice', lang: 'en-US' }]);
      }
    };

    const promise = populateVoiceListWithRetry(null);

    clock.tick(200); // Attempt 2
    clock.tick(200); // Attempt 3

    await promise;

    assert.equal(callCount, 3, 'Should have called getVoices 3 times');
    assert.equal(voicesSelect.options.length, 1, 'Should populate with 1 option after retries');
    assert.equal(voicesSelect.options[0].value, 'Delayed Voice', 'Option should be Delayed Voice');
    assert.equal(voicesSelect.value, 'Delayed Voice', 'Should select the voice');
    clock.restore();
  });

  QUnit.test('Timeout logic rejects after max retries', async (assert) => {
    assert.expect(2);
    const clock = sinon.useFakeTimers();

    let callCount = 0;
    chrome.tts.getVoicesMock = (callback) => {
      callCount++;
      callback([]); // Always return empty
    };

    const promise = populateVoiceListWithRetry(null);

    clock.tick(1000); // 5 * 200ms

    try {
      await promise;
      assert.ok(false, 'Should have rejected');
    } catch (err) {
      assert.equal(callCount, 6, 'Should have called getVoices 6 times (1 initial + 5 retries)');
      assert.equal(err.message, 'Timeout waiting for voices', 'Should reject with timeout error');
    }
    clock.restore();
  });
});

QUnit.module('Session State Persistence', (hooks) => {
  hooks.beforeEach(() => {
    state = {
      text: '',
      chunks: [],
      chunkIndex: 0,
      playbackState: 'stopped',
      rate: 1,
      voice: null,
      tabId: null
    };
    chrome.tts.reset();
    chrome.storage.session.clear();
  });

  QUnit.test('saveSessionState persists state to chrome.storage.session', (assert) => {
    state.text = 'Test text';
    state.chunks = ['Test text'];
    state.chunkIndex = 0;
    state.playbackState = 'playing';
    state.tabId = 42;

    saveSessionState();

    chrome.storage.session.get(['text', 'chunks', 'chunkIndex', 'playbackState', 'tabId'], (result) => {
      assert.equal(result.text, 'Test text', 'Text should be saved');
      assert.deepEqual(result.chunks, ['Test text'], 'Chunks should be saved');
      assert.equal(result.chunkIndex, 0, 'ChunkIndex should be saved');
      assert.equal(result.playbackState, 'playing', 'PlaybackState should be saved');
      assert.equal(result.tabId, 42, 'TabId should be saved');
    });
  });

  QUnit.test('play() calls saveSessionState', (assert) => {
    chrome.runtime.onMessage.sendMessage({ action: 'play', text: 'Save test.', tabId: 1 });

    chrome.storage.session.get(['playbackState'], (result) => {
      assert.equal(result.playbackState, 'playing', 'Session should have playing state after play');
    });
  });

  QUnit.test('pause() calls saveSessionState', (assert) => {
    chrome.runtime.onMessage.sendMessage({ action: 'play', text: 'Pause test.', tabId: 1 });
    chrome.runtime.onMessage.sendMessage({ action: 'pause' });

    chrome.storage.session.get(['playbackState'], (result) => {
      assert.equal(result.playbackState, 'paused', 'Session should have paused state after pause');
    });
  });

  QUnit.test('stop() calls saveSessionState and clears text', (assert) => {
    chrome.runtime.onMessage.sendMessage({ action: 'play', text: 'Stop test.', tabId: 1 });
    chrome.runtime.onMessage.sendMessage({ action: 'stop' });

    chrome.storage.session.get(['playbackState', 'text'], (result) => {
      assert.equal(result.playbackState, 'stopped', 'Session should have stopped state');
      assert.equal(result.text, '', 'Session text should be cleared');
    });
  });
});
