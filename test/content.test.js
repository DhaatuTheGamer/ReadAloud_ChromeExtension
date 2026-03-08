QUnit.module('Content Script - getArticleText', (hooks) => {
  let fixture;

  hooks.beforeEach(() => {
    // Clear selection
    window.getSelection().removeAllRanges();

    // Clear fixture
    fixture = document.getElementById('qunit-fixture');
    if (!fixture) {
      fixture = document.createElement('div');
      fixture.id = 'qunit-fixture';
      document.body.appendChild(fixture);
    }
    fixture.innerHTML = '';
  });

  hooks.afterEach(() => {
    // Clean up
    window.getSelection().removeAllRanges();
    if (fixture) {
      fixture.innerHTML = '';
    }
  });

  QUnit.test('Should return user selected text', (assert) => {
    const textNode = document.createTextNode('This is selected text.');
    fixture.appendChild(textNode);

    const range = document.createRange();
    range.selectNodeContents(fixture);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const result = getArticleText();
    assert.equal(result, 'This is selected text.', 'Returns selected text');
  });

  QUnit.test('Should return text from <article> tag', (assert) => {
    fixture.innerHTML = '<article>This is the main article content.</article><div>Other stuff</div>';

    const result = getArticleText();
    assert.equal(result, 'This is the main article content.', 'Returns text from <article>');
  });

  QUnit.test('Should return text from .post class', (assert) => {
    fixture.innerHTML = '<div class="post">This is a post content.</div>';

    const result = getArticleText();
    assert.equal(result, 'This is a post content.', 'Returns text from .post class');
  });

  QUnit.test('Should prioritize selectors correctly (e.g., <article> over <main>)', (assert) => {
    fixture.innerHTML = '<main>Main content</main><article>Article content</article>';

    const result = getArticleText();
    assert.equal(result, 'Article content', 'Prioritizes <article> over <main>');
  });

  QUnit.test('Should fallback to body if no other selector matches', (assert) => {
    // Since we're in a test environment, document.body exists and has other things.
    // So we need to be careful with this test.
    // It's tricky to test 'body' fallback purely because QUnit adds its own UI to body.
    // Instead, let's just make sure it gets *something* if we give it a very basic DOM.
    // Let's create an iframe with a clean body for this specific test

    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.body.innerHTML = 'Just some body text';

    // We have to mock document.querySelector for this specific test
    // or run getArticleText in the context of the iframe, but we can't easily inject it.
    // The easiest way is to mock querySelector temporarily

    const originalQuerySelector = document.querySelector;
    document.querySelector = (selector) => {
      if (selector === 'body') return iframeDoc.body;
      return null;
    };

    const result = getArticleText();

    // Restore
    document.querySelector = originalQuerySelector;
    document.body.removeChild(iframe);

    assert.equal(result, 'Just some body text', 'Falls back to body text');
  });

  QUnit.test('Should remove unwanted elements (nav, header, script, etc.)', (assert) => {
    fixture.innerHTML = `
      <article>
        <header>Article Header</header>
        <nav>Navigation</nav>
        <p>This is the actual text.</p>
        <script>console.log("bad");</script>
        <style>.bad { color: red; }</style>
        <footer>Article Footer</footer>
      </article>
    `;

    const result = getArticleText();
    assert.equal(result, 'This is the actual text.', 'Removes unwanted elements');
  });

  QUnit.test('Should not modify original DOM when removing unwanted elements', (assert) => {
    fixture.innerHTML = `
      <article>
        <header>Keep Me</header>
        <p>Text</p>
      </article>
    `;

    getArticleText();

    // The header should still be in the actual DOM
    const header = fixture.querySelector('header');
    assert.ok(header, 'Original DOM should still have the header');
    assert.equal(header.textContent, 'Keep Me', 'Header text remains');
  });

  QUnit.test('Should return empty string if no content found', (assert) => {
    const originalQuerySelector = document.querySelector;
    document.querySelector = () => null;

    const result = getArticleText();

    document.querySelector = originalQuerySelector;

    assert.equal(result, '', 'Returns empty string if nothing matches');
  });
});