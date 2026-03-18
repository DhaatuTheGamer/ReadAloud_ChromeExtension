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

QUnit.module('debounce', (hooks) => {
    let clock;

    hooks.beforeEach(() => {
        clock = sinon.useFakeTimers();
    });

    hooks.afterEach(() => {
        clock.restore();
    });

    QUnit.test('should delay function execution', (assert) => {
        let callCount = 0;
        const debounced = debounce(() => {
            callCount++;
        }, 100);

        debounced();
        assert.equal(callCount, 0, 'Function should not be called immediately');

        clock.tick(50);
        assert.equal(callCount, 0, 'Function should not be called before wait time');

        clock.tick(50);
        assert.equal(callCount, 1, 'Function should be called after wait time');
    });

    QUnit.test('should only execute once for multiple calls within wait time', (assert) => {
        let callCount = 0;
        const debounced = debounce(() => {
            callCount++;
        }, 100);

        debounced();
        debounced();
        debounced();

        clock.tick(100);
        assert.equal(callCount, 1, 'Function should be called only once');
    });

    QUnit.test('should restart timer on subsequent calls', (assert) => {
        let callCount = 0;
        const debounced = debounce(() => {
            callCount++;
        }, 100);

        debounced();
        clock.tick(50);
        debounced(); // Should reset timer
        clock.tick(60); // Total 110ms from first call, but only 60ms from second
        assert.equal(callCount, 0, 'Function should not be called yet');

        clock.tick(40); // Total 100ms from second call
        assert.equal(callCount, 1, 'Function should be called after reset wait time');
    });

    QUnit.test('should pass arguments to the original function', (assert) => {
        let receivedArgs;
        const debounced = debounce((...args) => {
            receivedArgs = args;
        }, 100);

        debounced('arg1', 'arg2');
        clock.tick(100);

        assert.deepEqual(receivedArgs, ['arg1', 'arg2'], 'Arguments should be passed correctly');
    });

    QUnit.test('should preserve the "this" context', (assert) => {
        let context;
        const obj = {
            method: debounce(function() {
                context = this;
            }, 100)
        };

        obj.method();
        clock.tick(100);

        assert.strictEqual(context, obj, '"this" should point to the object the method was called on');
    });
});
