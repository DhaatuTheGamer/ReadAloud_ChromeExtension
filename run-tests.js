const puppeteer = require('puppeteer');
const path = require('path');

async function runTests() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
      console.log('PAGE LOG:', msg.text());
  });

  page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.toString());
  });

  const testHtmlPath = `file://${path.resolve(__dirname, 'test/test.html')}`;
  console.log('Loading:', testHtmlPath);

  await page.goto(testHtmlPath, { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Page loaded, evaluating...');
  const results = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
        const checkDone = setInterval(() => {
            if (window.qunitDone) {
                clearInterval(checkDone);
                resolve(window.qunitDone);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkDone);
            resolve({ error: 'QUnit timeout', details: window.QUnit.config });
        }, 5000);
    });
  });

  console.log('Test Results:', results);
  await browser.close();

  if (results.testCounts && results.testCounts.failed > 0 || results.error) {
      process.exit(1);
  }
}

runTests().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});