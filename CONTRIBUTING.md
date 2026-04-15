# Contributing to Read Aloud Chrome Extension

Thank you for your interest in contributing! This document provides guidelines for contributing to the Read Aloud Chrome Extension.

## How to Report Bugs

1. Check the [existing issues](https://github.com/dhaatrik/ReadAloud_ChromeExtension/issues) to see if the bug has already been reported.
2. If not, [open a new issue](https://github.com/dhaatrik/ReadAloud_ChromeExtension/issues/new) with:
   - A clear and descriptive title.
   - Steps to reproduce the bug.
   - Expected behavior vs. actual behavior.
   - Your browser version and OS.

## How to Suggest Features

Open a [new issue](https://github.com/dhaatrik/ReadAloud_ChromeExtension/issues/new) with the **feature request** label. Include:
- A clear description of the feature.
- Why it would be useful.
- Any relevant examples or mockups.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dhaatrik/ReadAloud_ChromeExtension.git
   cd ReadAloud_ChromeExtension
   ```

2. **Install dependencies** (for running tests):
   ```bash
   npm install
   ```

3. **Load the extension in Chrome:**
   - Navigate to `chrome://extensions`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the project directory.

4. **Run the test suite:**
   ```bash
   npm test
   ```

## Pull Request Process

1. **Fork** the repository and create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes.** Follow the code style conventions below.

3. **Test your changes** to ensure nothing is broken:
   ```bash
   npm test
   ```

4. **Commit** with a clear, descriptive message:
   ```bash
   git commit -m "Add: brief description of change"
   ```

5. **Push** your branch and open a Pull Request against `main`.

## Code Style

- Use **vanilla JavaScript** (no frameworks or transpilers).
- Use `const` and `let` — never `var`.
- Use JSDoc comments for all public functions.
- Keep functions small and focused.
- Follow the existing code structure and naming conventions.

## Project Structure

```
scripts/        → Core extension logic (background, content, popup, utils)
popup/          → Popup UI (HTML + CSS)
icons/          → Extension icons
test/           → QUnit test suite with mocks
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
