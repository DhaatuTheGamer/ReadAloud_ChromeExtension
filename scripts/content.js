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

let highlightedElement = null;

function highlightText(text) {
    // Remove previous highlight
    if (highlightedElement) {
        highlightedElement.style.backgroundColor = '';
        highlightedElement = null;
    }

    if (!text) return;

    // Find the text on the page and highlight it
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
        const index = node.nodeValue.indexOf(text);
        if (index !== -1) {
            const parent = node.parentElement;
            if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT'].indexOf(parent.tagName) === -1) {
                parent.style.backgroundColor = 'yellow';
                highlightedElement = parent;
                parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
            }
        }
    }
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getText") {
        sendResponse({ text: getArticleText() });
    } else if (request.action === "highlight") {
        highlightText(request.text);
    }
});