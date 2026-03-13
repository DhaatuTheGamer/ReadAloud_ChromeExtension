from playwright.sync_api import sync_playwright

def run_qunit_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-web-security"])
        page = browser.new_page()
        page.on("console", lambda msg: print(f"{msg.text}"))

        # Load the local HTML file
        page.goto('file:///app/test/test.html')

        # Wait for QUnit to finish
        try:
            page.wait_for_function('window.QUnit && window.QUnit.config.queue.length === 0', timeout=5000)

            fails = page.evaluate('''() => {
                return window.qunit_fails || [];
            }''')
            errors = page.evaluate('''() => {
                return window.qunit_errors || [];
            }''')
            print(f"FAILS: {fails}")
            print(f"ERRORS: {errors}")

            # Since QUnit elements might be wiped out or something, let's hook into QUnit log

            # Get results more robustly
            results = page.evaluate('''() => {
                const details = [];
                const failLis = document.querySelectorAll('li.fail');
                for (const li of failLis) {
                    if (li.id && li.id.startsWith('qunit-test-output-')) {
                        const moduleName = li.querySelector('.module-name')?.textContent || '';
                        const testName = li.querySelector('.test-name')?.textContent || '';
                        const asserts = li.querySelectorAll('ol > li.fail');
                        for (const a of asserts) {
                            const message = a.querySelector('.test-message')?.textContent || '';
                            const expected = a.querySelector('.test-expected')?.textContent || '';
                            const actual = a.querySelector('.test-actual')?.textContent || '';
                            const source = a.querySelector('.test-source')?.textContent || '';
                            details.push(`${moduleName}: ${testName}\\nMessage: ${message}\\nExpected: ${expected}\\nActual: ${actual}\\nSource: ${source}`);
                        }
                    } else if (!li.closest('ol')) {
                         const testNameNode = li.querySelector('.test-name');
                         const messageNode = li.querySelector('.test-message');
                         const actualNode = li.querySelector('.test-actual');
                         const expectedNode = li.querySelector('.test-expected');
                         const sourceNode = li.querySelector('.test-source');

                         let msg = (testNameNode ? testNameNode.textContent : "Unknown");
                         if (messageNode) msg += "\\n" + messageNode.textContent;
                         if (actualNode) msg += "\\nActual: " + actualNode.textContent;
                         if (expectedNode) msg += "\\nExpected: " + expectedNode.textContent;
                         if (sourceNode) msg += "\\nSource: " + sourceNode.textContent;
                         details.push(msg);
                    }
                }
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
