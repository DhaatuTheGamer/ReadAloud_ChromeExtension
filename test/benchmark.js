const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('popup/popup.html', 'utf8');
let scriptContent = fs.readFileSync('scripts/popup.js', 'utf8');

function testScript(modifiedScriptContent, label) {
    return new Promise(resolve => {
        const dom = new JSDOM(html);
        global.window = dom.window;
        global.document = dom.window.document;
        global.setTimeout = setTimeout;
        global.clearTimeout = clearTimeout;

        let sendMessageCount = 0;
        global.chrome = {
          runtime: {
            sendMessage: () => { sendMessageCount++; }
          },
          tts: {
            getVoices: (cb) => cb([])
          }
        };

        try {
            eval(modifiedScriptContent);
        } catch(e) {
            // ignore init errors
        }

        const rateInput = document.getElementById('rate');

        const start = performance.now();

        for (let i = 0; i < 1000; i++) {
          rateInput.value = i % 100;
          rateInput.dispatchEvent(new window.Event('input'));
          rateInput.dispatchEvent(new window.Event('change'));
        }

        const end = performance.now();

        setTimeout(() => {
            console.log(`[${label}] sendMessage called ${sendMessageCount} times in ${end - start} ms (sync time)`);
            resolve();
        }, 500);
    });
}

async function run() {
    await testScript(scriptContent, 'Baseline');

    // Replace the event listener
    const debounceFunc = `
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
`;
    let optimizedScript = scriptContent.replace(
        "// --- Event Listeners ---",
        debounceFunc + "\n// --- Event Listeners ---"
    );
    optimizedScript = optimizedScript.replace(
        "rateInput.addEventListener('change', (e) => {\n  chrome.runtime.sendMessage({ action: 'setRate', rate: e.target.value });\n});",
        "rateInput.addEventListener('change', debounce((e) => {\n  chrome.runtime.sendMessage({ action: 'setRate', rate: e.target.value });\n}, 300));"
    );
    optimizedScript = optimizedScript.replace(
        "voicesSelect.addEventListener('change', (e) => {\n  chrome.runtime.sendMessage({ action: 'setVoice', voice: e.target.value });\n});",
        "voicesSelect.addEventListener('change', debounce((e) => {\n  chrome.runtime.sendMessage({ action: 'setVoice', voice: e.target.value });\n}, 300));"
    );

    await testScript(optimizedScript, 'Optimized');
}

run();
