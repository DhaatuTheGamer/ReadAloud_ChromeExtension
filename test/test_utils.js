QUnit.module('Debounce Utility', () => {
  QUnit.test('should delay function execution', (assert) => {
    const done = assert.async();
    let callCount = 0;
    const debounced = debounce(() => {
      callCount++;
    }, 50);

    debounced();
    assert.equal(callCount, 0, 'Function should not be called immediately');

    setTimeout(() => {
      assert.equal(callCount, 1, 'Function should be called after delay');
      done();
    }, 100);
  });

  QUnit.test('multiple calls should result in a single execution', (assert) => {
    const done = assert.async();
    let callCount = 0;
    const debounced = debounce(() => {
      callCount++;
    }, 50);

    debounced();
    debounced();
    debounced();

    assert.equal(callCount, 0, 'Function should not be called immediately');

    setTimeout(() => {
      assert.equal(callCount, 1, 'Function should be called only once');
      done();
    }, 100);
  });

  QUnit.test('should be called with correct arguments', (assert) => {
    const done = assert.async();
    let argsReceived;
    const debounced = debounce((...args) => {
      argsReceived = args;
    }, 50);

    debounced('arg1', 'arg2');

    setTimeout(() => {
      assert.deepEqual(argsReceived, ['arg1', 'arg2'], 'Function should receive correct arguments');
      done();
    }, 100);
  });

  QUnit.test('subsequent calls after delay should re-trigger', (assert) => {
    const done = assert.async();
    let callCount = 0;
    const debounced = debounce(() => {
      callCount++;
    }, 50);

    debounced();

    setTimeout(() => {
      assert.equal(callCount, 1, 'First execution should happen');
      debounced();

      setTimeout(() => {
        assert.equal(callCount, 2, 'Second execution should happen');
        done();
      }, 100);
    }, 100);
  });
});
