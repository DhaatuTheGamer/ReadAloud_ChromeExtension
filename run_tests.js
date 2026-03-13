const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    // console.log(`[Console]: ${msg.text()}`);
  });

  await page.goto(`file://${process.cwd()}/test/test.html`);

  // Wait for qunit to finish
  await page.waitForFunction(() => {
    const el = document.getElementById('qunit-testresult-display');
    return el && el.innerText.includes('tests completed');
  });

  const results = await page.evaluate(() => {
    const el = document.getElementById('qunit-testresult-display');
    return el ? el.innerText : 'not found';
  });

  console.log('QUnit Results:', results);

  await browser.close();
})();
