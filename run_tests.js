const { chromium } = require('playwright');
const path = require('path');

async function runTests() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Route console logs to terminal
    page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Browser Error]: ${err}`));

    const testHtmlPath = `file://${path.resolve(__dirname, 'test/test.html')}`;
    console.log(`Navigating to: ${testHtmlPath}`);

    await page.goto(testHtmlPath);

    // Wait for QUnit to finish. QUnit adds an element with id="qunit-testresult" when done.
    await page.waitForFunction(() => {
        const resultEl = document.getElementById('qunit-testresult');
        return resultEl && resultEl.textContent.includes('completed in');
    });

    const results = await page.evaluate(() => {
        const resultEl = document.getElementById('qunit-testresult');
        if (!resultEl) return { error: "Could not find test results" };

        const summaryText = resultEl.textContent;
        const passMatch = summaryText.match(/(\d+) passed/);
        const failMatch = summaryText.match(/(\d+) failed/);
        const totalMatch = summaryText.match(/(\d+) assertions/);

        const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
        const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
        const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

        return { summaryText, passed, failed, total };
    });

    console.log("\n--- QUnit Test Results ---");
    if (results.error) {
        console.error(results.error);
        process.exit(1);
    } else {
        console.log(results.summaryText);
        if (results.failed > 0) {
            console.error(`❌ Tests failed: ${results.failed} out of ${results.total} assertions failed.`);

            // Get detailed failure information
            const failures = await page.evaluate(() => {
              const fails = [];
              const failedItems = document.querySelectorAll('#qunit-tests > li.fail');
              failedItems.forEach(item => {
                const moduleName = item.querySelector('.module-name')?.textContent || 'Global';
                const testName = item.querySelector('.test-name')?.textContent || 'Unknown test';
                fails.push(`- ${moduleName}: ${testName}`);
              });
              return fails;
            });
            console.error("Failed tests:");
            failures.forEach(f => console.error(f));

            process.exit(1);
        } else {
            console.log(`✅ All ${results.total} assertions passed successfully!`);
        }
    }

    await browser.close();
}

runTests().catch(err => {
    console.error("Test runner failed:", err);
    process.exit(1);
});
