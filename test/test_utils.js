QUnit.module('injectAndGetText', (hooks) => {
    let originalExecuteScript;
    let originalTabsSendMessage;
    let originalConsoleError;

    hooks.beforeEach(() => {
        originalExecuteScript = chrome.scripting.executeScript;
        originalTabsSendMessage = chrome.tabs.sendMessage;
        originalConsoleError = console.error;

        // Reset last error
        chrome.runtime.lastError = null;

        // Suppress console.error in tests
        console.error = () => {};
    });

    hooks.afterEach(() => {
        chrome.scripting.executeScript = originalExecuteScript;
        chrome.tabs.sendMessage = originalTabsSendMessage;
        console.error = originalConsoleError;
        chrome.runtime.lastError = null;
    });

    QUnit.test('Happy path: Successful script injection and message passing', (assert) => {
        const done = assert.async();
        const testTabId = 123;
        const expectedText = "Extracted text content";

        chrome.scripting.executeScript = (options, callback) => {
            assert.deepEqual(options, {
                target: { tabId: testTabId },
                files: ['scripts/content.js']
            }, 'executeScript called with correct options');

            // Simulate successful injection
            if (callback) callback();
        };

        chrome.tabs.sendMessage = (tabId, message, callback) => {
            assert.equal(tabId, testTabId, 'sendMessage called with correct tabId');
            assert.deepEqual(message, { action: "getText" }, 'sendMessage called with correct action');

            // Simulate successful message response
            if (callback) {
                callback({ text: expectedText });
            }
            return Promise.resolve();
        };

        injectAndGetText(testTabId, (result) => {
            assert.equal(result, expectedText, 'Callback should receive the extracted text');
            done();
        });
    });

    QUnit.test('Error handling: Script injection failure', (assert) => {
        const done = assert.async();
        const testTabId = 456;

        chrome.scripting.executeScript = (options, callback) => {
            // Simulate injection failure
            chrome.runtime.lastError = { message: "Injection failed" };
            if (callback) callback();
        };

        chrome.tabs.sendMessage = () => {
            assert.ok(false, 'sendMessage should not be called if injection fails');
        };

        injectAndGetText(testTabId, (result) => {
            assert.strictEqual(result, null, 'Callback should receive null on injection failure');
            done();
        });
    });

    QUnit.test('Error handling: Message passing failure', (assert) => {
        const done = assert.async();
        const testTabId = 789;

        chrome.scripting.executeScript = (options, callback) => {
            // Simulate successful injection
            if (callback) callback();
        };

        chrome.tabs.sendMessage = (tabId, message, callback) => {
            // Simulate message sending failure
            chrome.runtime.lastError = { message: "Message failed" };
            if (callback) {
                callback(); // Callback with no response/undefined
            }
            return Promise.resolve();
        };

        injectAndGetText(testTabId, (result) => {
            assert.strictEqual(result, null, 'Callback should receive null on message sending failure');
            done();
        });
    });

    QUnit.test('Edge case: Message response is null or missing text', (assert) => {
        const done = assert.async();
        const testTabId = 101;

        chrome.scripting.executeScript = (options, callback) => {
            if (callback) callback();
        };

        // Test with missing text property
        chrome.tabs.sendMessage = (tabId, message, callback) => {
            if (callback) {
                callback({ otherProp: "value" });
            }
            return Promise.resolve();
        };

        injectAndGetText(testTabId, (result) => {
            assert.strictEqual(result, null, 'Callback should receive null when response lacks text');

            // Test with null response
            chrome.tabs.sendMessage = (tabId, message, callback) => {
                if (callback) {
                    callback(null);
                }
                return Promise.resolve();
            };

            injectAndGetText(testTabId, (result2) => {
                assert.strictEqual(result2, null, 'Callback should receive null when response is null');
                done();
            });
        });
    });
});
