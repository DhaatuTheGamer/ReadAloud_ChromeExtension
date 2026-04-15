<p align="center">
  <img src="icons/icon128.png" alt="Read Aloud Logo" width="128" height="128">
</p>

# 🔊 Read Aloud — Chrome Extension

[![CI](https://github.com/dhaatrik/ReadAloud_ChromeExtension/actions/workflows/ci.yml/badge.svg)](https://github.com/dhaatrik/ReadAloud_ChromeExtension/actions/workflows/ci.yml)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A lightweight Chrome extension that converts any web page into an audiobook experience. It intelligently extracts article content, reads it aloud with natural sentence-level phrasing, and highlights the current sentence — all powered by your browser's built-in Text-to-Speech engine. No external APIs, no data collection, no signup required.

---

## Table of Contents

- [Why Read Aloud?](#why-read-aloud)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Author](#author)
- [License](#license)

---

## Why Read Aloud?

Long articles, research papers, and blog posts are everywhere — but not everyone has the time (or energy) to read them visually. Existing TTS extensions often rely on external APIs, collect user data, or require paid subscriptions. **Read Aloud** solves this by leveraging the browser's native `chrome.tts` API for completely offline, private, and free text-to-speech.

**Key design decisions:**
- **Zero dependencies at runtime** — no frameworks, no external libraries, no API keys. Just vanilla JavaScript and the Chrome Extensions API.
- **Manifest V3** — built on Chrome's latest extension platform for better security and performance.
- **Sentence-level chunking** — text is split at sentence boundaries (not arbitrary character counts) for natural phrasing and accurate highlighting.

---

## Features

| Feature | Description |
|---------|-------------|
| ▶️ **Persistent Playback** | Play, pause, and stop reading. Playback continues even after the popup is closed. |
| 🗣️ **Voice Selection** | Choose from any TTS voice available in your browser (system + third-party). |
| ⚡ **Adjustable Speed** | Control reading speed from 0.5× to 2.0× with a debounced slider. |
| 🔍 **Smart Extraction** | Automatically detects the main article content (`<article>`, `<main>`, `[role="main"]`, etc.) and strips away navigation, headers, footers, and scripts. |
| ✂️ **Selection Support** | Select any text on the page and click Play to read only your selection. |
| 🔦 **Live Highlighting** | The sentence currently being spoken is highlighted in yellow and auto-scrolled into view. |
| ⌨️ **Keyboard Shortcut** | Toggle play/pause globally with **Alt+Shift+P** (customizable in `chrome://extensions/shortcuts`). |
| 🔄 **Settings Persistence** | Your preferred voice and speed are saved via `chrome.storage.sync` across sessions. |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Vanilla JavaScript (ES2022) | Extension logic — no framework overhead |
| **Platform** | Chrome Extensions API (Manifest V3) | Permissions, service worker, content scripts |
| **TTS Engine** | `chrome.tts` | Browser-native Text-to-Speech — offline and private |
| **Storage** | `chrome.storage.sync` | Persist user preferences across devices |
| **UI** | HTML + CSS | Minimal popup interface |
| **Testing** | QUnit + Sinon + Playwright | Unit tests with browser-level Chrome API mocks |
| **Linting** | ESLint v9 (flat config) | Code quality enforcement |
| **CI/CD** | GitHub Actions | Automated lint → test → build pipeline |

---

## Installation

### Prerequisites

- **Google Chrome** (or any Chromium-based browser)
- **Node.js ≥ 18** and **npm** (only for development/testing)

### Load the Extension

1. Clone the repository:
   ```bash
   git clone https://github.com/dhaatrik/ReadAloud_ChromeExtension.git
   cd ReadAloud_ChromeExtension
   ```

2. Open Chrome and navigate to `chrome://extensions`.

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the project directory.

5. The 🔊 **Read Aloud** icon will appear in your toolbar.

### Install Dev Dependencies (Optional)

Only required if you plan to run tests or lint:

```bash
npm install
npx playwright install chromium
```

---

## Usage

### Basic Reading

1. Navigate to any web page with article content.
2. Click the **Read Aloud** icon in your toolbar.
3. Press **Play** — the extension will extract the article text and begin reading.

### Controls

| Control | Action |
|---------|--------|
| **Play** button | Start reading (or resume from pause) |
| **Pause** button | Pause the current reading |
| **Stop** button | Stop reading and reset to the beginning |
| **Speed slider** | Adjust reading speed (0.5×–2.0×) |
| **Voice dropdown** | Switch between available TTS voices |
| **Alt+Shift+P** | Global keyboard shortcut to toggle play/pause |

### Reading Selected Text

1. Highlight any text on the page with your mouse.
2. Click the extension icon and press **Play**.
3. Only the selected text will be read.

> **Tip:** Playback persists even if you close the popup. Use the keyboard shortcut or re-open the popup to pause/stop.

---

## Project Structure

```
ReadAloud_ChromeExtension/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── icons/
│   ├── icon16.png              # Toolbar icon
│   ├── icon48.png              # Extensions page icon
│   └── icon128.png             # Chrome Web Store icon
├── popup/
│   ├── popup.html              # Extension popup UI
│   └── popup.css               # Popup styling
├── scripts/
│   ├── background.js           # Service worker — TTS orchestration & state
│   ├── content.js              # Content script — text extraction & highlighting
│   ├── popup.js                # Popup logic — UI controls & event handlers
│   └── utils.js                # Shared utility — script injection helper
├── test/
│   ├── mocks.js                # Chrome API mock implementations
│   ├── test.html               # QUnit test runner HTML
│   ├── test.js                 # Core test suite (45 tests)
│   └── test_utils.js           # Tests for utility functions & debounce
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
├── eslint.config.js            # ESLint v9 flat config
├── manifest.json               # Chrome extension manifest (V3)
├── package.json
└── run_tests.js                # Playwright-based test runner
```

---

## Testing

The project includes a comprehensive QUnit test suite covering playback logic, text chunking, article extraction, popup UI, voice list population, debounce behavior, and utility functions.

### Run Tests

```bash
# Install dependencies (first time only)
npm install
npx playwright install chromium

# Run the full test suite
npm test
```

### Run Linter

```bash
npm run lint
```

### What's Tested

| Module | Coverage |
|--------|----------|
| **Playback Logic** | Play, pause, stop, resume, keyboard shortcuts, restart-on-settings-change |
| **Text Chunking** | Empty input, short text, sentence boundaries, long sentences, mixed punctuation |
| **Article Extraction** | Selection priority, selector fallback chain, unwanted element removal |
| **Popup UI** | Button states, rate slider, voice dropdown, empty state handling |
| **Voice List** | Immediate load, retry logic, timeout/max-attempts, default selection |
| **Utilities** | `injectAndGetText` happy path + error handling, `debounce` timing & context |

> **45 tests · 109 assertions · 0 failures**

---

## CI/CD Pipeline

Every push and pull request to `main` triggers a three-stage GitHub Actions pipeline:

```
Lint (ESLint) → Test (QUnit via Playwright) → Build (zip + upload artifact)
```

| Stage | Tool | What It Does |
|-------|------|-------------|
| **Lint** | ESLint v9 | Enforces code quality rules across all JS files |
| **Test** | QUnit + Playwright | Runs the full test suite in a headless Chromium browser |
| **Build** | `zip` + `upload-artifact` | Packages the extension into a ready-to-install `.zip` file |

The build artifact (`read-aloud-extension.zip`) is downloadable from the Actions tab for 30 days.

---

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for:

- 🐛 How to report bugs
- 💡 How to suggest features
- 🔧 Development setup instructions
- 📝 Pull request process
- 🎨 Code style conventions

---

## Roadmap

- [ ] **Granular Speed Input** — Allow users to type a specific speed value
- [ ] **Internationalization (i18n)** — Translate the popup UI into multiple languages
- [ ] **Error Feedback** — Display a message when no readable text is found
- [ ] **Navigation Controls** — Add next/previous buttons to skip by sentence or paragraph
- [ ] **Progress Indicator** — Show reading progress (e.g., "Sentence 5 of 42")

---

## Author

**Dhaatrik Chowdhury** — [@dhaatrik](https://github.com/dhaatrik)

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.