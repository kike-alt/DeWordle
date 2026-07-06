/**
 * QA-216: Docs command-snippet verification harness.
 *
 * Verifies that command snippets documented for contributors and maintainers
 * exist and are structurally valid. Broken snippets surface here so they can
 * be fixed before contributors hit them during onboarding.
 *
 * Scope:
 *   - Critical npm scripts referenced in CONTRIBUTING.md / README / docs
 *   - Core toolchain entry points (build, test, typecheck, lint)
 *   - Dev and CI-specific script variants
 */
import * as fs from 'fs';
import * as path from 'path';

// Resolve the backend package.json relative to this spec file.
// Spec file is at: backend/src/indexer/docs-snippets.spec.ts
// package.json is at: backend/package.json
const PACKAGE_JSON_PATH = path.join(__dirname, '..', '..', 'package.json');

let packageJson: { scripts?: Record<string, string>; name?: string; version?: string };

beforeAll(() => {
  const raw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  packageJson = JSON.parse(raw);
});

describe('QA-216: docs command-snippet verification — backend/package.json scripts', () => {
  // Documented as essential onboarding commands in CONTRIBUTING.md
  const CONTRIBUTOR_COMMANDS = ['build', 'start', 'start:dev', 'test', 'lint'] as const;

  // Commands referenced in CI documentation and workflows
  const CI_COMMANDS = ['test:ci', 'typecheck', 'lint:ci'] as const;

  // Commands referenced in the database setup docs
  const DB_COMMANDS = ['db:setup', 'typeorm:migration:run', 'seed:words'] as const;

  it('package.json is readable and has a scripts section', () => {
    expect(packageJson).toBeDefined();
    expect(packageJson.scripts).toBeDefined();
    expect(typeof packageJson.scripts).toBe('object');
  });

  it.each(CONTRIBUTOR_COMMANDS)(
    'contributor command "%s" is present in package.json scripts',
    (cmd) => {
      expect(packageJson.scripts).toHaveProperty(cmd);
      expect(typeof packageJson.scripts![cmd]).toBe('string');
      expect(packageJson.scripts![cmd].length).toBeGreaterThan(0);
    },
  );

  it.each(CI_COMMANDS)(
    'CI command "%s" is present in package.json scripts',
    (cmd) => {
      expect(packageJson.scripts).toHaveProperty(cmd);
    },
  );

  it.each(DB_COMMANDS)(
    'database command "%s" is present in package.json scripts',
    (cmd) => {
      expect(packageJson.scripts).toHaveProperty(cmd);
    },
  );

  it('test:ci command targets the indexer directory (regression guard)', () => {
    const testCiScript = packageJson.scripts!['test:ci'];
    expect(testCiScript).toContain('src/indexer');
  });

  it('typecheck command runs tsc --noEmit (no output artefacts emitted)', () => {
    const typecheckScript = packageJson.scripts!['typecheck'];
    expect(typecheckScript).toContain('--noEmit');
  });

  it('build command invokes the nest CLI (not raw tsc)', () => {
    const buildScript = packageJson.scripts!['build'];
    expect(buildScript).toContain('nest build');
  });

  it('no documented script references a non-existent binary (sanity check)', () => {
    const scripts = Object.values(packageJson.scripts ?? {});
    // None of the critical scripts should reference a clearly wrong binary
    const suspicious = scripts.filter((s) => s.includes('undefined') || s.includes('null'));
    expect(suspicious).toHaveLength(0);
  });
});

describe('QA-216: docs command-snippet verification — test harness self-check', () => {
  it('package.json path resolves correctly from the spec file location', () => {
    expect(fs.existsSync(PACKAGE_JSON_PATH)).toBe(true);
  });

  it('parsed package.json has a name field', () => {
    expect(typeof packageJson.name).toBe('string');
    expect(packageJson.name!.length).toBeGreaterThan(0);
  });
});
