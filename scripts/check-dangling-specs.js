#!/usr/bin/env node
/**
 * Flags test files that Vitest/Jest would silently ignore or that are missing.
 *
 *  - FAIL: legacy/misnamed JS test files (`*test*.js`, `*spec*.js`) under
 *    frontend/src and backend/src (tests there are TypeScript).
 *  - WARN: a component in frontend/src/components without a matching
 *    `<Name>.spec.tsx` / `<Name>.test.tsx` (same folder or `__tests__/`).
 *
 * Exit code 1 when any FAIL is found.
 */
const fs = require('fs');
const path = require('path');

const ROOTS = ['frontend/src', 'backend/src'];
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** Files named like tests but written as plain JS. */
function findMisnamedTests(files) {
  return files.filter((f) => /(test|spec)[^/\\]*\.js$/i.test(path.basename(f)));
}

/** Components under a `components/` folder with no sibling or __tests__ test. */
function findUntestedComponents(files) {
  const set = new Set(files.map((f) => f.split(path.sep).join('/')));
  const missing = [];
  for (const f of files) {
    const norm = f.split(path.sep).join('/');
    if (!/\/components\/[^/]+\.tsx$/.test(norm)) continue;
    if (/\.(spec|test|stories)\.tsx$/.test(norm)) continue;
    const dir = path.posix.dirname(norm);
    const name = path.posix.basename(norm, '.tsx');
    const candidates = [
      `${dir}/${name}.spec.tsx`,
      `${dir}/${name}.test.tsx`,
      `${dir}/__tests__/${name}.spec.tsx`,
      `${dir}/__tests__/${name}.test.tsx`,
    ];
    if (!candidates.some((c) => set.has(c))) missing.push(f);
  }
  return missing;
}

function main(root = process.cwd()) {
  const files = ROOTS.flatMap((r) => walk(path.join(root, r))).map((f) => path.relative(root, f));
  const misnamed = findMisnamedTests(files);
  const untested = findUntestedComponents(files);

  for (const f of untested) console.warn(`WARN: component without a test file: ${f}`);
  for (const f of misnamed) console.error(`FAIL: misnamed/legacy test file (use .spec.ts/.test.ts): ${f}`);

  if (misnamed.length) {
    console.error(`\n${misnamed.length} misnamed test file(s) found.`);
    return 1;
  }
  console.log(`No dangling test files. (${untested.length} component(s) without tests, warnings only.)`);
  return 0;
}

module.exports = { findMisnamedTests, findUntestedComponents, main };

if (require.main === module) process.exit(main());
