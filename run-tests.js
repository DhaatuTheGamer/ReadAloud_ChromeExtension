const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        // Expose function to handle QUnit results
        let testResults = {};
        await page.exposeFunction('onQUnitDone', (details) => {
            testResults = details;
        });

        const testUrl = 'file://' + path.resolve(__dirname, 'test', 'test.html');
        console.log(`Navigating to ${testUrl}`);

        await page.goto(testUrl, { waitUntil: 'networkidle0' });

        // Inject script to listen for QUnit.done
        await page.evaluate(() => {
            if (window.QUnit) {
                window.QUnit.done((details) => {
                    window.onQUnitDone(details);
                });
            } else {
                console.error("QUnit not found on window object.");
            }
        });

        // wait for QUnit to finish
        const testResults2 = await page.evaluate(() => {
            return new Promise(resolve => {
                if (window.QUnit && window.QUnit.config && window.QUnit.config.queue.length === 0 && window.QUnit.config.stats) {
                    resolve({
                       total: window.QUnit.config.stats.all,
                       passed: window.QUnit.config.stats.all - window.QUnit.config.stats.bad,
                       failed: window.QUnit.config.stats.bad
                    });
                }
                QUnit.done((details) => {
                    resolve(details);
                });
            });
        });

        await browser.close();

        console.log(`\nTests finished.`);
        console.log(`Total: ${testResults2.total}`);
        console.log(`Passed: ${testResults2.passed}`);
        console.log(`Failed: ${testResults2.failed}`);

        if (testResults2.failed > 0) {
            console.error('\nSome tests failed!');
            process.exit(1);
        } else {
            console.log('\nAll tests passed successfully!');
            process.exit(0);
        }
    } catch (err) {
        console.error('Error running tests:', err);
        process.exit(1);
    }
})();
