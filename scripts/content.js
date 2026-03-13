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
    const unwantedSelectors = 'nav, header, footer, .nav, .header, .footer, script, style, noscript, iframe, aside, img, figure';
    clone.querySelectorAll(unwantedSelectors).forEach(el => el.remove());

    return clone.innerText.trim();
  }

  return '';
}

let highlightedElement = null;

function highlightText(text) {
    // Remove previous highlight
    if (highlightedElement) {
        highlightedElement.style.backgroundColor = '';
        highlightedElement = null;
    }

    if (!text) return;

    // Find the text on the page and highlight it
    try {
        // Escape quotes for XPath string representation
        const escapeQuotes = (str) => {
            if (!str.includes("'")) return `'${str}'`;
            if (!str.includes('"')) return `"${str}"`;
            return `concat('${str.replace(/'/g, "', \"'\", '")}')`;
        };

        const xpath = `//text()[contains(., ${escapeQuotes(text)})]`;
        const result = document.evaluate(xpath, document.body, null, XPathResult.ANY_TYPE, null);
        let node = result.iterateNext();
        while (node) {
            // verify it actually has the exact text (or just relying on contains).
            // XPath contains is case-sensitive, just like indexOf.
            const index = node.nodeValue.indexOf(text);
            if (index !== -1) {
                const parent = node.parentElement;
                if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE' && parent.tagName !== 'NOSCRIPT') {
                    parent.style.backgroundColor = 'yellow';
                    highlightedElement = parent;
                    parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }
            }
            node = result.iterateNext();
        }
    } catch (e) {
        console.error("Highlight search failed", e);
    }
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getText") {
        sendResponse({ text: getArticleText() });
    } else if (request.action === "highlight") {
        highlightText(request.text);
    }
});