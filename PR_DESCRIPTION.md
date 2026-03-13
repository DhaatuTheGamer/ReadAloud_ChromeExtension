⚡ Performance Optimization: DocumentFragment for Voice Selection

💡 **What:**
Updated `scripts/popup.js` to populate the `voicesSelect` dropdown menu using a `DocumentFragment` instead of appending `<option>` elements directly to the DOM one by one inside a loop.

🎯 **Why:**
Using `DocumentFragment` is a well-established performance optimization when inserting multiple elements into the DOM. By appending new nodes to a `DocumentFragment` first and then appending the single fragment to the live DOM, it avoids triggering multiple reflows, repaints, and layout thrashings associated with modifying a live DOM element continuously. This makes the UI more responsive, particularly in scenarios where the user's system provides a large list of available voices.

📊 **Measured Improvement:**
A headless Playwright and JS DOM micro-benchmark was written (`playwright_benchmark.js` and `benchmark.js`) to simulate iterating and appending `option` elements directly vs using `DocumentFragment`.

While JIT optimizations and DOM batching in modern browsers can make the absolute difference smaller in isolated, tight loops (often around ~1-10% improvement depending on iteration count), the true benefit of `DocumentFragment` lies in preventing expensive layout recalculations in a fully rendered application. By making this simple and idiomatic optimization, we ensure the browser only has to compute layout changes once when the final fragment is appended, leading to more predictable rendering performance as the dataset scales.

All QUnit tests in `test.html` run correctly, verifying that this change is safe and functionality is preserved exactly.