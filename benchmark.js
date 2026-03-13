const { JSDOM } = require('jsdom');

function createVoices(num) {
  const voices = [];
  for (let i = 0; i < num; i++) {
    voices.push({ voiceName: `Voice ${i}`, lang: `en-US` });
  }
  return voices;
}

function runBenchmark(numVoices) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><select id="voices"></select></body></html>`);
  const document = dom.window.document;
  const voicesSelect = document.getElementById('voices');
  const voices = createVoices(numVoices);

  // Measure Current Implementation
  const startCurrent = performance.now();
  for (let i = 0; i < 5000; i++) {
    voicesSelect.replaceChildren(); // Clear any existing options
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.textContent = `${voice.voiceName} (${voice.lang})`;
      option.value = voice.voiceName;
      voicesSelect.appendChild(option);
    });
  }
  const endCurrent = performance.now();
  const currentDuration = endCurrent - startCurrent;

  // Measure Optimized Implementation
  const startOptimized = performance.now();
  for (let i = 0; i < 5000; i++) {
    voicesSelect.replaceChildren(); // Clear any existing options
    const fragment = document.createDocumentFragment();
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.textContent = `${voice.voiceName} (${voice.lang})`;
      option.value = voice.voiceName;
      fragment.appendChild(option);
    });
    voicesSelect.appendChild(fragment);
  }
  const endOptimized = performance.now();
  const optimizedDuration = endOptimized - startOptimized;

  console.log(`--- Number of Voices: ${numVoices} ---`);
  console.log(`Current Implementation (5000 iterations): ${currentDuration.toFixed(2)} ms`);
  console.log(`Optimized Implementation (5000 iterations): ${optimizedDuration.toFixed(2)} ms`);
  console.log(`Improvement: ${(((currentDuration - optimizedDuration) / currentDuration) * 100).toFixed(2)}%`);
  console.log('');
}

runBenchmark(10);
runBenchmark(50);
runBenchmark(100);