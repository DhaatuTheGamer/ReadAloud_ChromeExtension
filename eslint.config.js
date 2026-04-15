import globals from "globals";

export default [
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        chrome: "readonly",
        importScripts: "readonly",
        injectAndGetText: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off",
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",
      "curly": ["warn", "multi-line"],
      "no-throw-literal": "error",
      "no-duplicate-case": "error",
      "no-fallthrough": "error",
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        chrome: "readonly",
        QUnit: "readonly",
        sinon: "readonly",
        // Functions exposed globally from source files under test
        getArticleText: "readonly",
        highlightText: "readonly",
        chunkText: "readonly",
        splitLongSentence: "readonly",
        play: "readonly",
        pause: "readonly",
        stop: "readonly",
        speak: "readonly",
        resume: "readonly",
        restartPlaybackIfPlaying: "readonly",
        state: "writable",
        updateUI: "readonly",
        populateVoiceListWithRetry: "readonly",
        debounce: "readonly",
        injectAndGetText: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off",
      "eqeqeq": ["error", "always"],
      "no-var": "error",
    },
  },
  {
    files: ["run_tests.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.node,
        document: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];
