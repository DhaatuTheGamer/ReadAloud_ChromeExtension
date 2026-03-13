QUnit.module('utils.js: injectAndGetText', (hooks) => {
    hooks.beforeEach(() => {
        chrome.runtime.lastError = null;
        chrome.tabs.mockMessageResponse = null;
    });

    QUnit.test('Happy path: executes script and returns text', (assert) => {
        assert.expect(1);
        const expectedText = "This is the extracted text.";
        chrome.tabs.mockMessageResponse = { text: expectedText };

        injectAndGetText(1, (text) => {
            assert.equal(text, expectedText, 'Callback should receive the text from the message response');
        });
    });

    QUnit.test('Script injection fails', (assert) => {
        assert.expect(1);
        chrome.runtime.lastError = { message: "Injection failed" };

        injectAndGetText(1, (text) => {
            assert.strictEqual(text, null, 'Callback should receive null if script injection fails');
        });
    });

    QUnit.test('Message sending fails', (assert) => {
        assert.expect(1);

        // Mock executeScript to set lastError just before sendMessage is called
        // We'll override the mock temporarily for this test
        const originalExecuteScript = chrome.scripting.executeScript;
        chrome.scripting.executeScript = (options, callback) => {
            chrome.runtime.lastError = null; // No error on injection
            if (callback) {
                // Set lastError just before the sendMessage callback is evaluated
                const originalSendMessage = chrome.tabs.sendMessage;
                chrome.tabs.sendMessage = (tabId, message, options_or_cb, cb) => {
                    chrome.runtime.lastError = { message: "Message sending failed" };
                    return originalSendMessage(tabId, message, options_or_cb, cb);
                };
                callback();
                chrome.tabs.sendMessage = originalSendMessage;
            }
        };

        injectAndGetText(1, (text) => {
            assert.strictEqual(text, null, 'Callback should receive null if message sending fails');
            // Restore mock
            chrome.scripting.executeScript = originalExecuteScript;
        });
    });

    QUnit.test('Empty response', (assert) => {
        assert.expect(1);
        chrome.tabs.mockMessageResponse = {}; // Empty object, no 'text' property

        injectAndGetText(1, (text) => {
            assert.strictEqual(text, null, 'Callback should receive null if response lacks text');
        });
    });

    QUnit.test('Null response', (assert) => {
        assert.expect(1);
        chrome.tabs.mockMessageResponse = null;

        injectAndGetText(1, (text) => {
            assert.strictEqual(text, null, 'Callback should receive null if response is null');
        });
    });
});
