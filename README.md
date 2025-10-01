# Read Aloud Chrome Extension

A simple, robust Chrome extension that reads the content of a web page aloud using your browser's built-in text-to-speech capabilities.

## Features

*   **Persistent Controls:** Play, pause, and stop the reading. Playback continues even if the popup is closed.
*   **Voice Selection:** Choose from any of the voices available in your browser.
*   **Adjustable Speed:** Control the reading speed from 0.5x to 2.0x.
*   **Smart Text Extraction:** Automatically finds and reads the main article content on a page, ignoring menus, headers, and footers. Also reads any text you have selected.
*   **Natural Phrasing:** Chunks text by sentences, not by character count, for a more natural listening experience.
*   **Text Highlighting:** The sentence currently being read is highlighted on the page.
*   **Keyboard Shortcut:** Toggle play/pause with a global shortcut (**Alt+Shift+P** by default).

## File Structure

```
.
├── manifest.json
├── README.md
├── icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup
│   ├── popup.css
│   └── popup.html
└── scripts
    ├── background.js
    ├── content.js
    └── popup.js
```

## How to Install (for Development)

1.  Clone or download this repository to your local machine.
2.  Open the Google Chrome browser and navigate to `chrome://extensions`.
3.  Enable "Developer mode" using the toggle in the top-right corner.
4.  Click the "Load unpacked" button.
5.  Select the directory where you cloned/downloaded this repository.
6.  The "Read Aloud" extension icon will appear in your browser's toolbar.

## How to Use

1.  Navigate to a web page with an article you want to read.
2.  Click the "Read Aloud" extension icon in your toolbar.
3.  Use the "Play", "Pause", and "Stop" buttons to control the reading.
4.  Adjust the speed and select a different voice using the controls in the popup.
5.  Alternatively, select any text on the page and then click "Play" to read only your selection.
6.  You can also use the **Alt+Shift+P** keyboard shortcut to quickly start, pause, or resume reading.

## To-Do / Future Ideas

*   **More Granular Speed Control:** Allow users to type in a specific speed.
*   **Internationalization (i18n):** Translate the UI into different languages.
*   **Error Feedback:** Show a message in the popup if no readable text can be found on the page.
*   **Custom "Next/Previous" buttons:** Add controls to skip forward or back by a sentence or paragraph.