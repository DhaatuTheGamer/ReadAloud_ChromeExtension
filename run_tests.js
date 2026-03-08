const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--disable-web-security'] });
    const page = await browser.newPage();
    const filePath = 'file://' + path.resolve(__dirname, 'test/test.html');

    // Log console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.stack || err.message));

    await page.goto(filePath);
    await page.waitForFunction(() => {
        const result = document.querySelector('#qunit-testresult-display');
        return result && result.textContent.includes('tests completed');
    }, {timeout: 10000});

    const passedTests = await page.evaluate(() => {
        const p = [];
        document.querySelectorAll('#qunit-tests > li.pass').forEach(li => {
            p.push(li.querySelector('.test-name').textContent);
        });
        return p;
    });

    const errors = await page.evaluate(() => {
        const errs = [];
        document.querySelectorAll('#qunit-tests > li.fail').forEach(li => {
            const name = li.querySelector('.test-name').textContent;
            li.querySelectorAll('ol > li.fail .test-message').forEach(errLi => {
                errs.push(`${name}: ${errLi.textContent}`);
            });
        });
        return errs;
    });

    const results = await page.evaluate(() => {
        return {
            passed: document.querySelector('#qunit-testresult-display .passed')?.textContent,
            failed: document.querySelector('#qunit-testresult-display .failed')?.textContent,
            total: document.querySelector('#qunit-testresult-display .total')?.textContent,
        };
    });

    console.log(results);
    console.log("Passed:", passedTests);
    if (errors.length > 0) {
        console.log("Errors:", errors);
        process.exit(1);
    }
    await browser.close();
})();
