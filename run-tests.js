const { JSDOM } = require('jsdom');
const path = require('path');

const testFile = path.join(__dirname, 'test', 'test.html');

JSDOM.fromFile(testFile, {
  runScripts: "dangerously",
  resources: "usable"
}).then(dom => {
  // We need to wait for scripts to load and execute
  dom.window.addEventListener("load", () => {
    if (!dom.window.QUnit) {
      console.error("QUnit failed to load.");
      process.exit(1);
    }
  // Wait for QUnit to finish
  dom.window.QUnit.done((details) => {
    console.log(`\nTotal: ${details.total} Failed: ${details.failed} Passed: ${details.passed} Runtime: ${details.runtime}ms`);
    if (details.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });

  // Log test results
  dom.window.QUnit.testDone((details) => {
    if (details.failed > 0) {
      console.log(`\n❌ ${details.module} - ${details.name}`);
      details.assertions.forEach(a => {
        if (!a.result) {
          console.log(`  Failed assertion: ${a.message}`);
          console.log(`  Expected: ${a.expected}`);
          console.log(`  Actual: ${a.actual}`);
        }
      });
    } else {
      console.log(`✅ ${details.module} - ${details.name}`);
    }
  });
  });
}).catch(err => {
  console.error("Error running tests:", err);
  process.exit(1);
});