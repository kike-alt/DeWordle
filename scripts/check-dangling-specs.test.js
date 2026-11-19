const test = require('node:test');
const assert = require('node:assert');
const { findMisnamedTests, findUntestedComponents } = require('./check-dangling-specs');

test('flags *test*.js and *spec*.js files', () => {
  const files = ['frontend/src/a/foo.spec.js', 'backend/src/b/bar.test.js', 'frontend/src/a/ok.spec.ts'];
  assert.deepStrictEqual(findMisnamedTests(files), ['frontend/src/a/foo.spec.js', 'backend/src/b/bar.test.js']);
});

test('does not flag ordinary JS or TS tests', () => {
  assert.deepStrictEqual(findMisnamedTests(['frontend/src/util.js', 'backend/src/x.spec.ts']), []);
});

test('warns for components without a test and accepts sibling or __tests__ tests', () => {
  const files = [
    'frontend/src/components/A.tsx',
    'frontend/src/components/B.tsx',
    'frontend/src/components/B.spec.tsx',
    'frontend/src/components/C.tsx',
    'frontend/src/components/__tests__/C.test.tsx',
  ];
  assert.deepStrictEqual(findUntestedComponents(files), ['frontend/src/components/A.tsx']);
});
