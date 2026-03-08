function injectAndGetText(tabId, callback) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['scripts/content.js'],
    }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
            callback(null);
            return;
        }
        chrome.tabs.sendMessage(tabId, { action: "getText" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(`Message sending failed: ${chrome.runtime.lastError.message}`);
                callback(null);
                return;
            }
            if (response && response.text) {
                callback(response.text);
            } else {
                callback(null);
            }
        });
    });
}
