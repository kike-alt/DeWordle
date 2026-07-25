/**
 * QA-205: Legacy backend module smoke gate grouped by debt bucket.
 *
 * Purpose: Give maintainers a per-module view of legacy cleanup progress.
 * Each describe block maps to one debt bucket defined in
 * docs/contributors/backend-debt-buckets.md. Tests are intentionally lightweight
 * smoke checks — they verify that modules load and core shapes are intact
 * without requiring a running database or network.
 *
 * Bucket status legend used in describe labels:
 *   [BUCKET 1] Persistence Layer & Index Alignment Optimization
 *   [BUCKET 2] Real-Time Infrastructure Decoupling
 *   [BUCKET 3] State Machine Escrow Guarding
 *
 * Adding a test here signals that a debt item is being tracked. Marking a
 * test with `it.todo` signals the item is known but not yet addressed.
 * Graduating a `todo` to a passing test signals progress on that bucket.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a path relative to backend/src. */
function srcPath(...parts: string[]): string {
  return path.join(SRC, ...parts);
}

/** Return true if a file exists under backend/src. */
function srcFileExists(...parts: string[]): boolean {
  return fs.existsSync(srcPath(...parts));
}

/** Read a file under backend/src as UTF-8 text. */
function srcRead(...parts: string[]): string {
  return fs.readFileSync(srcPath(...parts), 'utf8');
}

// ---------------------------------------------------------------------------
// BUCKET 1 — Persistence Layer & Index Alignment Optimization
// Target: backend/src/entities/
// Debt: redundant queries, missing composite indices, unoptimised TypeORM
//       entity relations.
// ---------------------------------------------------------------------------

describe('[BUCKET 1] Persistence Layer & Index Alignment Optimization', () => {
  describe('entity files exist', () => {
    it('word.entity.ts is present', () => {
      expect(srcFileExists('entities', 'word.entity.ts')).toBe(true);
    });

    it('auditLogs.entity.ts is present', () => {
      expect(srcFileExists('entities', 'auditLogs.entity.ts')).toBe(true);
    });

    it('rejectedWords.entity.ts is present', () => {
      expect(srcFileExists('entities', 'rejectedWords.entity.ts')).toBe(true);
    });

    it('test.entity.ts is present (legacy scaffold)', () => {
      expect(srcFileExists('entities', 'test.entity.ts')).toBe(true);
    });
  });

  describe('word.entity.ts structural smoke', () => {
    it('declares @Entity decorator', () => {
      const src = srcRead('entities', 'word.entity.ts');
      expect(src).toContain('@Entity');
    });

    it('declares a primary key column', () => {
      const src = srcRead('entities', 'word.entity.ts');
      expect(src).toMatch(/@PrimaryGeneratedColumn|@PrimaryColumn/);
    });

    it('declares a word column', () => {
      const src = srcRead('entities', 'word.entity.ts');
      expect(src).toContain('word');
    });
  });

  describe('migration files exist and are ordered', () => {
    it('migrations directory is present', () => {
      expect(srcFileExists('migrations')).toBe(true);
    });

    it('at least one migration file exists', () => {
      const migDir = srcPath('migrations');
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.ts'));
      expect(files.length).toBeGreaterThan(0);
    });

    it('migration filenames follow the timestamp-Name pattern', () => {
      const migDir = srcPath('migrations');
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.ts'));
      const badNames = files.filter((f) => !/^\d{13}-\w+\.ts$/.test(f));
      expect(badNames).toEqual([]);
    });
  });

  describe('data-source.ts smoke', () => {
    it('data-source.ts exists', () => {
      expect(srcFileExists('data-source.ts')).toBe(true);
    });

    it('data-source.ts references DataSource from typeorm', () => {
      const src = srcRead('data-source.ts');
      expect(src).toContain('DataSource');
    });

    it('data-source.ts wires up the migrations directory', () => {
      const src = srcRead('data-source.ts');
      expect(src).toContain('migrations');
    });
  });

  // Progress markers — graduate these todos as bucket cleanup lands
  it.todo(
    'all entity relations use explicit JoinColumn (no implicit FK magic)',
  );
  it.todo('word.entity.ts has a composite index on (isActive, difficulty)');
  it.todo(
    'AddProjectionQueryIndexes migration adds all planned composite indices',
  );
});

// ---------------------------------------------------------------------------
// BUCKET 2 — Real-Time Infrastructure Decoupling
// Target: backend/src/realtime/, backend/src/modules/
// Debt: direct inline event emissions in REST controllers; needs extraction
//       into background event streams and gateways.
// NOTE: target directories do not yet exist — todos track expected landing
//       paths so maintainers can observe progress.
// ---------------------------------------------------------------------------

describe('[BUCKET 2] Real-Time Infrastructure Decoupling', () => {
  describe('current state baseline', () => {
    it('game-sessions module directory exists', () => {
      expect(srcFileExists('game-sessions')).toBe(true);
    });

    it('game-sessions.service.ts does not directly import a WebSocket gateway (pre-decoupling baseline)', () => {
      const src = srcRead('game-sessions', 'game-sessions.service.ts');
      // Before decoupling, the service should not have a hard WS dependency.
      // If this test fails after decoupling work lands, remove it and add the
      // corresponding gateway existence test below.
      expect(src).not.toMatch(/WebSocketGateway|@WebSocketServer/);
    });

    it('app.module.ts exists and wires core modules', () => {
      expect(srcFileExists('app.module.ts')).toBe(true);
      const src = srcRead('app.module.ts');
      expect(src).toContain('@Module');
    });
  });

  // Progress markers — graduate as decoupling work lands
  it.todo('backend/src/realtime/ directory exists after decoupling');
  it.todo('realtime.module.ts is registered in app.module.ts');
  it.todo(
    'game-sessions controller emits events via EventEmitter2, not inline',
  );
  it.todo('WebSocket gateway unit spec exists and passes');
  it.todo('realtime.spec.ts verifies decoupled event isolation');
});

// ---------------------------------------------------------------------------
// BUCKET 3 — State Machine Escrow Guarding
// Target: backend/src/modules/escrow/
// Debt: hardcoded validation rules, complex switch statements, untracked
//       status transitions in the escrow settlement state machine.
// NOTE: escrow module does not yet exist — todos track expected landing paths.
// ---------------------------------------------------------------------------

describe('[BUCKET 3] State Machine Escrow Guarding', () => {
  describe('current state baseline', () => {
    it('game-sessions status enum exists (legacy state transition reference)', () => {
      expect(srcFileExists('game-sessions', 'enums', 'sessionStatus.ts')).toBe(
        true,
      );
    });

    it('sessionStatus.ts defines at least one status value', () => {
      const src = srcRead('game-sessions', 'enums', 'sessionStatus.ts');
      // Should contain an enum or const object
      expect(src).toMatch(/enum|const.*=\s*{/);
    });

    it('game-sessions.service.ts exists as the current state owner', () => {
      expect(srcFileExists('game-sessions', 'game-sessions.service.ts')).toBe(
        true,
      );
    });
  });

  // Progress markers — graduate as escrow module work lands
  it.todo('backend/src/modules/escrow/ directory exists');
  it.todo('escrow state machine covers all valid status transitions');
  it.todo('invalid status transitions are rejected at the state machine level');
  it.todo('escrow state spec passes: npm run test:escrow-states');
  it.todo(
    'no hardcoded switch-case status logic remains in game-sessions.service.ts',
  );
});

// ---------------------------------------------------------------------------
// Cross-bucket: general safety invariants
// ---------------------------------------------------------------------------

describe('Cross-bucket safety invariants', () => {
  it('backend/src has no stray .js files that should be .ts (compiled artefact check)', () => {
    // Compiled JS artefacts in src/ suggest an accidental `tsc` run into the
    // source tree. Only .ts files should live here.
    function collectJsFiles(dir: string): string[] {
      const results: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...collectJsFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          results.push(full);
        }
      }
      return results;
    }
    const jsFiles = collectJsFiles(SRC);
    expect(jsFiles).toEqual([]);
  });

  it('debt-buckets documentation file exists', () => {
    const docPath = path.resolve(
      __dirname,
      '..',
      '..',
      'docs',
      'contributors',
      'backend-debt-buckets.md',
    );
    expect(fs.existsSync(docPath)).toBe(true);
  });

  it('debt-buckets doc references all three bucket names', () => {
    const docPath = path.resolve(
      __dirname,
      '..',
      '..',
      'docs',
      'contributors',
      'backend-debt-buckets.md',
    );
    const doc = fs.readFileSync(docPath, 'utf8');
    expect(doc).toContain('Persistence Layer');
    expect(doc).toContain('Real-Time');
    expect(doc).toContain('State Machine');
  });
});
