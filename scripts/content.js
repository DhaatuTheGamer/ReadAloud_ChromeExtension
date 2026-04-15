// Guard against duplicate injections — if content.js is injected multiple times,
// only the first injection registers listeners. Subsequent injections are no-ops.
if (!window._readAloudInjected) {
  window._readAloudInjected = true;

  // Inject highlight style for the CSS Custom Highlight API
  const _readAloudUseHighlightAPI = (typeof CSS !== 'undefined' && typeof CSS.highlights !== 'undefined');
  if (_readAloudUseHighlightAPI) {
    const styleEl = document.createElement('style');
    styleEl.textContent = '::highlight(read-aloud-active) { background-color: #FFEB3B; }';
    document.head.appendChild(styleEl);
  }

  function getArticleText() {
    // If there's a selection, return it
    const selection = window.getSelection().toString().trim();
    if (selection) {
      return selection;
    }

    const selectors = [
      'article',
      '.article',
      '.post',
      '.entry',
      'main',
      '.main',
      '[role="main"]',
      '#content',
      '.content',
      '#main-content',
      '#article',
      'body'
    ];

    let bestElement = null;
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        bestElement = element;
        break;
      }
    }

    if (bestElement) {
      // Clone the element to avoid modifying the original page
      const clone = bestElement.cloneNode(true);

      // Remove unwanted elements
      const unwantedSelectors = ['nav', 'header', 'footer', '.nav', '.header', '.footer', 'script', 'style', 'noscript', 'iframe', 'aside', 'img', 'figure'];
      unwantedSelectors.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      });

      return clone.innerText.trim();
    }

    return '';
  }

  // --- Highlighting ---

  // Fallback state for browsers without CSS Custom Highlight API
  let _fallbackHighlightedElement = null;

  function highlightText(text) {
    // Clear previous highlights
    if (_readAloudUseHighlightAPI) {
      CSS.highlights.delete('read-aloud-active');
    } else if (_fallbackHighlightedElement) {
      _fallbackHighlightedElement.style.backgroundColor = '';
      _fallbackHighlightedElement = null;
    }

    if (!text) return;

    // Find the text node on the page
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const index = node.nodeValue.indexOf(text);
        if (index !== -1) {
          const parent = node.parentElement;
          if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE' && parent.tagName !== 'NOSCRIPT') {
            if (_readAloudUseHighlightAPI) {
              // Use CSS Custom Highlight API — no DOM mutation
              const range = new Range();
              range.setStart(node, index);
              range.setEnd(node, index + text.length);
              const highlight = new Highlight(range);
              CSS.highlights.set('read-aloud-active', highlight);
            } else {
              // Fallback: mutate inline style
              parent.style.backgroundColor = 'yellow';
              _fallbackHighlightedElement = parent;
            }
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      }
    } catch (e) {
      console.error("Highlight search failed", e);
    }
  }

  // Expose globally for testing
  window.highlightText = highlightText;
  window.getArticleText = getArticleText;

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.action === "getText") {
        sendResponse({ text: getArticleText() });
      } else if (request.action === "highlight") {
        highlightText(request.text);
      }
    });
  }
}