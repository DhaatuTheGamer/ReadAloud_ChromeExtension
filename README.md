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
- **Language-aware segmentation** — text is split using the `Intl.Segmenter` API for accurate sentence boundaries, correctly handling abbreviations like "Dr.", "U.S.A.", and "e.g."

---

## Features

| Feature | Description |
|---------|-------------|
| ▶️ **Persistent Playback** | Play, pause, and stop reading. Playback continues even after the popup is closed. |
| 🗣️ **Voice Selection** | Choose from any TTS voice available in your browser (system + third-party). |
| ⚡ **Adjustable Speed** | Control reading speed from 0.5× to 2.0× with a debounced slider. |
| 🔍 **Smart Extraction** | Automatically detects the main article content (`<article>`, `<main>`, `[role="main"]`, etc.) and strips away navigation, headers, footers, and scripts. |
| ✂️ **Selection Support** | Select any text on the page and click Play to read only your selection. |
| 🔦 **Live Highlighting** | The sentence currently being spoken is highlighted using the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) — no DOM mutation. Falls back gracefully on older browsers. |
| ⌨️ **Keyboard Shortcuts** | Toggle play/pause (**Alt+Shift+P**), skip forward (**Alt+Shift+Right**), skip backward (**Alt+Shift+Left**). |
| 🔄 **Settings Persistence** | Your preferred voice and speed are saved via `chrome.storage.sync` across sessions. |
| 🧠 **Smart Segmentation** | Uses `Intl.Segmenter` for language-aware sentence splitting — handles "Dr.", "U.S.A.", "e.g." correctly. |
| 💾 **Service Worker Survival** | Playback state is backed up to `chrome.storage.session` — survives MV3 service worker restarts. |
| 🌙 **Dark Mode** | Popup UI automatically adapts to your OS dark/light mode preference. |
| ⚠️ **Error Feedback** | Shows a clear message when the extension can't access a restricted page (e.g., `chrome://` URLs). |
| ✈️ **Offline Capable** | Works completely offline — no internet connection required. |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Vanilla JavaScript (ES2022) | Extension logic — no framework overhead |
| **Platform** | Chrome Extensions API (Manifest V3) | Permissions, service worker, content scripts |
| **TTS Engine** | `chrome.tts` | Browser-native Text-to-Speech — offline and private |
| **NLP** | `Intl.Segmenter` | Language-aware sentence splitting (built into Chrome) |
| **Highlighting** | CSS Custom Highlight API | Non-destructive text highlighting without DOM mutation |
| **Storage** | `chrome.storage.sync` + `session` | Persist preferences (sync) and playback state (session) |
| **UI** | HTML + CSS (with dark mode) | Minimal popup interface with OS theme detection |
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
| **Alt+Shift+P** | Toggle play/pause |
| **Alt+Shift+Right** | Skip to the next sentence |
| **Alt+Shift+Left** | Skip to the previous sentence |

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
│   ├── test.js                 # Core test suite (59 tests)
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

The project includes a comprehensive QUnit test suite covering playback logic, text chunking, article extraction, popup UI, voice list population, skip commands, session state persistence, error UI, debounce behavior, and utility functions.

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
| **Playback Logic** | Play, pause, stop, resume, keyboard shortcuts, restart-on-settings-change, playbackEnded broadcast |
| **Skip Commands** | Forward/backward navigation, bounds checking, paused → playing transition, keyboard dispatch |
| **Text Chunking** | Empty input, short text, Intl.Segmenter abbreviations, sentence boundaries, long sentences |
| **Article Extraction** | Selection priority, selector fallback chain, unwanted element removal |
| **Popup UI** | Button states, rate slider, voice dropdown, error UI (showError/hideError), highlighting |
| **Voice List** | Immediate load, retry logic, timeout/max-attempts, default selection |
| **Session Persistence** | Save/restore state, play/pause/stop trigger persistence |
| **Utilities** | `injectAndGetText` happy path + error handling, `debounce` timing & context |

> **59 tests · 141 assertions · 0 failures**

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

The build artifact is dynamically versioned (e.g., `read-aloud-extension-v4.0.0.zip`) and downloadable from the Actions tab for 30 days.

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

- [x] ~~**Error Feedback** — Display a message when no readable text is found~~ *(v4.0.0)*
- [x] ~~**Navigation Controls** — Add next/previous buttons to skip by sentence or paragraph~~ *(v4.0.0)*
- [ ] **Granular Speed Input** — Allow users to type a specific speed value
- [ ] **Internationalization (i18n)** — Translate the popup UI into multiple languages
- [ ] **Progress Indicator** — Show reading progress (e.g., "Sentence 5 of 42")

---

## Author

**Dhaatrik Chowdhury** — [@dhaatrik](https://github.com/dhaatrik)

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.