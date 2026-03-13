const puppeteer = require('puppeteer');
const path = require('path');

async function runTests() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Forward console messages to the node console
  page.on('console', msg => console.log(msg.text()));

  // Expose a function that QUnit can call when tests complete
  await page.exposeFunction('reportTestResults', (results) => {
    return results;
  });

  const testUrl = `file://${path.join(__dirname, 'test', 'test.html')}`;
  console.log(`Loading tests from ${testUrl}...`);

  // Add an initial script to hook into QUnit.done before loading the page
  await page.evaluateOnNewDocument(() => {
    window.onload = () => {
      if (window.QUnit) {
        QUnit.done((details) => {
          window.reportTestResults(details);
        });
      }
    };
  });

  // Wrap page load and wait in a promise that resolves when testResults are reported
  const testResults = await new Promise(async (resolve, reject) => {
    try {
      // Setup the handler for QUnit.done before loading the page
      page.exposeFunction('testCompleted', (results) => {
        resolve(results);
      }).catch(reject);

      await page.evaluateOnNewDocument(() => {
        // Hook early into window
        Object.defineProperty(window, 'QUnit', {
          configurable: true,
          enumerable: true,
          set(qunit) {
            this._qunit = qunit;
            qunit.done((details) => {
              window.testCompleted(details);
            });
          },
          get() {
            return this._qunit;
          }
        });
      });

      await page.goto(testUrl);
    } catch (e) {
      reject(e);
    }
  });

  await browser.close();

  console.log('\n--- Test Results ---');
  console.log(`Total: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Time: ${testResults.runtime} ms\n`);

  if (testResults.failed > 0) {
    console.error('Some tests failed.');
    process.exit(1);
  } else {
    console.log('All tests passed!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});
