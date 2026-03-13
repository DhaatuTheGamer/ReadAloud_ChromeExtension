from playwright.sync_api import sync_playwright

def run_qunit_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Load the local HTML file
        page.goto('file:///app/test/test.html')

        # Wait for QUnit to finish
        try:
            page.wait_for_function('window.QUnit && window.QUnit.config.queue.length === 0', timeout=5000)

            # Get results more robustly
            results = page.evaluate('''() => {
                const details = [];
                const failNodes = document.querySelectorAll('#qunit-tests > li.fail');
                failNodes.forEach(fail => {
                    const testNameNode = fail.querySelector('.test-name');
                    const messageNode = fail.querySelector('.test-message');
                    const actualNode = fail.querySelector('.test-actual');
                    const expectedNode = fail.querySelector('.test-expected');

                    let msg = (testNameNode ? testNameNode.textContent : "Unknown");
                    if (messageNode) msg += "\\n" + messageNode.textContent;
                    if (actualNode) msg += "\\nActual: " + actualNode.textContent;
                    if (expectedNode) msg += "\\nExpected: " + expectedNode.textContent;

                    details.push(msg);
                });
                return {
                    stats: QUnit.config.stats,
                    failedTests: details
                };
            }''')
            print(f"Stats: {results['stats']}")
            for f in results['failedTests']:
                print(f"FAILED: {f}")
        except Exception as e:
            print(f"Error: {e}")

        browser.close()

if __name__ == '__main__':
    run_qunit_tests()
