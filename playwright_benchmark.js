const { chromium } = require('playwright');

async function runPlaywrightBenchmark() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <select id="voices"></select>
      <script>
        function createVoices(num) {
          const voices = [];
          for (let i = 0; i < num; i++) {
            voices.push({ voiceName: 'Voice ' + i, lang: 'en-US' });
          }
          return voices;
        }

        window.runBenchmark = function(numVoices) {
          const voicesSelect = document.getElementById('voices');
          const voices = createVoices(numVoices);

          // Warmup
          for (let i = 0; i < 100; i++) {
            voicesSelect.replaceChildren();
            voices.forEach(voice => {
              const option = document.createElement('option');
              option.textContent = voice.voiceName + ' (' + voice.lang + ')';
              option.value = voice.voiceName;
              voicesSelect.appendChild(option);
            });
          }

          // Measure Current Implementation
          const startCurrent = performance.now();
          for (let i = 0; i < 1000; i++) {
            voicesSelect.replaceChildren(); // Clear any existing options
            voices.forEach(voice => {
              const option = document.createElement('option');
              option.textContent = voice.voiceName + ' (' + voice.lang + ')';
              option.value = voice.voiceName;
              voicesSelect.appendChild(option);
            });
          }
          const endCurrent = performance.now();
          const currentDuration = endCurrent - startCurrent;

          // Warmup optimized
          for (let i = 0; i < 100; i++) {
            voicesSelect.replaceChildren();
            const fragment = document.createDocumentFragment();
            voices.forEach(voice => {
              const option = document.createElement('option');
              option.textContent = voice.voiceName + ' (' + voice.lang + ')';
              option.value = voice.voiceName;
              fragment.appendChild(option);
            });
            voicesSelect.appendChild(fragment);
          }

          // Measure Optimized Implementation
          const startOptimized = performance.now();
          for (let i = 0; i < 1000; i++) {
            voicesSelect.replaceChildren(); // Clear any existing options
            const fragment = document.createDocumentFragment();
            voices.forEach(voice => {
              const option = document.createElement('option');
              option.textContent = voice.voiceName + ' (' + voice.lang + ')';
              option.value = voice.voiceName;
              fragment.appendChild(option);
            });
            voicesSelect.appendChild(fragment);
          }
          const endOptimized = performance.now();
          const optimizedDuration = endOptimized - startOptimized;

          return {
            numVoices,
            currentDuration,
            optimizedDuration,
            improvement: (((currentDuration - optimizedDuration) / currentDuration) * 100).toFixed(2)
          };
        }
      </script>
    </body>
    </html>
  `);

  const results = [];
  results.push(await page.evaluate(() => window.runBenchmark(10)));
  results.push(await page.evaluate(() => window.runBenchmark(50)));
  results.push(await page.evaluate(() => window.runBenchmark(100)));
  results.push(await page.evaluate(() => window.runBenchmark(500)));

  for (const res of results) {
    console.log(`--- Number of Voices: ${res.numVoices} ---`);
    console.log(`Current Implementation (1000 iterations): ${res.currentDuration.toFixed(2)} ms`);
    console.log(`Optimized Implementation (1000 iterations): ${res.optimizedDuration.toFixed(2)} ms`);
    console.log(`Improvement: ${res.improvement}%`);
    console.log('');
  }

  await browser.close();
}

runPlaywrightBenchmark();