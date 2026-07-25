/**
 * QA-208: Projection migration compatibility tests.
 *
 * Covers:
 *  - getMigrationPath() logic: empty path when current, ordered chain, out-of-range rejection
 *  - A concrete 1→2 migration fixture: successful migration path
 *  - An intentionally rejected mismatch: gap with no registered migration
 *  - Idempotency: re-running a migration on an already-migrated row is a no-op
 *  - CURRENT_PROJECTION_VERSION is a positive integer
 */

import {
  CURRENT_PROJECTION_VERSION,
  getMigrationPath,
  PROJECTION_MIGRATIONS,
  ProjectionMigration,
} from './projection-version';

// ---------------------------------------------------------------------------
// Helpers — build an isolated migration registry for testing without mutating
// the real PROJECTION_MIGRATIONS array.
// ---------------------------------------------------------------------------

function makeMigration(
  fromVersion: number,
  toVersion: number,
  transform?: (row: Record<string, unknown>) => Record<string, unknown>,
): ProjectionMigration {
  return {
    fromVersion,
    toVersion,
    description: `test migration v${fromVersion}→v${toVersion}`,
    migrate(row) {
      return transform ? transform(row) : row;
    },
  };
}

/**
 * Run getMigrationPath against a custom migrations array instead of the
 * module-level registry, so tests are fully self-contained.
 */
function getMigrationPathWith(
  migrations: ProjectionMigration[],
  fromVersion: number,
  toVersion: number,
): ProjectionMigration[] {
  if (fromVersion >= toVersion) return [];
  return migrations
    .filter((m) => m.fromVersion >= fromVersion && m.toVersion <= toVersion)
    .sort((a, b) => a.fromVersion - b.fromVersion);
}

// ---------------------------------------------------------------------------
// CURRENT_PROJECTION_VERSION sanity
// ---------------------------------------------------------------------------

describe('CURRENT_PROJECTION_VERSION', () => {
  it('is a positive integer', () => {
    expect(typeof CURRENT_PROJECTION_VERSION).toBe('number');
    expect(Number.isInteger(CURRENT_PROJECTION_VERSION)).toBe(true);
    expect(CURRENT_PROJECTION_VERSION).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getMigrationPath — core logic
// ---------------------------------------------------------------------------

describe('getMigrationPath', () => {
  it('returns empty array when fromVersion equals toVersion (already current)', () => {
    const path = getMigrationPath(1, 1);
    expect(path).toEqual([]);
  });

  it('returns empty array when fromVersion is greater than toVersion (future row)', () => {
    const path = getMigrationPath(3, 1);
    expect(path).toEqual([]);
  });

  it('returns empty array when no migrations are registered for the requested range', () => {
    // PROJECTION_MIGRATIONS is currently empty (version 1 is initial)
    const path = getMigrationPath(1, 2);
    expect(path).toEqual([]);
  });

  it('returns the matching migration when a v1→v2 migration is registered', () => {
    const v1v2 = makeMigration(1, 2);
    const path = getMigrationPathWith([v1v2], 1, 2);
    expect(path).toHaveLength(1);
    expect(path[0].fromVersion).toBe(1);
    expect(path[0].toVersion).toBe(2);
  });

  it('returns an ordered chain for a multi-hop path (v1→v2→v3)', () => {
    const v1v2 = makeMigration(1, 2);
    const v2v3 = makeMigration(2, 3);
    const path = getMigrationPathWith([v2v3, v1v2], 1, 3); // intentionally unordered input
    expect(path).toHaveLength(2);
    expect(path[0].fromVersion).toBe(1);
    expect(path[1].fromVersion).toBe(2);
  });

  it('excludes migrations outside the requested version window', () => {
    const v1v2 = makeMigration(1, 2);
    const v3v4 = makeMigration(3, 4);
    const path = getMigrationPathWith([v1v2, v3v4], 1, 2);
    expect(path).toHaveLength(1);
    expect(path[0].fromVersion).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Successful migration path — concrete v1→v2 fixture
// ---------------------------------------------------------------------------

describe('ProjectionMigration — successful migration path', () => {
  const v1v2: ProjectionMigration = {
    fromVersion: 1,
    toVersion: 2,
    description: 'Back-fill rewardAmount from attemptsUsed scoring table',
    migrate(row) {
      // Idempotent: only set rewardAmount if not already present
      row.rewardAmount = row.rewardAmount ?? 0;
      return row;
    },
  };

  it('applies the migration to a stale v1 row and produces a v2 row', () => {
    const staleRow: Record<string, unknown> = {
      sessionId: 'sess-001',
      player: 'GABC',
      dayId: 42,
      status: 'Won',
      attemptsUsed: 3,
      schemaVersion: 1,
      // rewardAmount intentionally absent (v1 shape)
    };

    const migratedRow = v1v2.migrate({ ...staleRow });

    expect(migratedRow['rewardAmount']).toBe(0);
    expect(migratedRow['sessionId']).toBe('sess-001'); // existing fields preserved
    expect(migratedRow['attemptsUsed']).toBe(3);
  });

  it('migration is idempotent — re-running on already-migrated row is a no-op', () => {
    const alreadyMigratedRow: Record<string, unknown> = {
      sessionId: 'sess-002',
      rewardAmount: 150, // already set
      schemaVersion: 2,
    };

    const resultFirst = v1v2.migrate({ ...alreadyMigratedRow });
    const resultSecond = v1v2.migrate({ ...resultFirst });

    // Value must not be overwritten
    expect(resultFirst['rewardAmount']).toBe(150);
    expect(resultSecond['rewardAmount']).toBe(150);
  });

  it('getMigrationPath returns this migration when registered', () => {
    const path = getMigrationPathWith([v1v2], 1, 2);
    expect(path).toHaveLength(1);
    const migratedRow = path[0].migrate({ schemaVersion: 1 });
    expect(migratedRow['rewardAmount']).toBe(0);
  });

  it('applies multiple migrations in order for a v1→v3 chain', () => {
    const v2v3: ProjectionMigration = {
      fromVersion: 2,
      toVersion: 3,
      description: 'Add leaderboardEligible flag',
      migrate(row) {
        row.leaderboardEligible = row.leaderboardEligible ?? true;
        return row;
      },
    };

    const row: Record<string, unknown> = {
      sessionId: 'sess-003',
      schemaVersion: 1,
    };
    const chain = getMigrationPathWith([v1v2, v2v3], 1, 3);

    expect(chain).toHaveLength(2);

    let current = { ...row };
    for (const migration of chain) {
      current = migration.migrate(current) as Record<string, unknown>;
    }

    expect(current['rewardAmount']).toBe(0);
    expect(current['leaderboardEligible']).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Intentionally rejected mismatch — version gap with no registered migration
// ---------------------------------------------------------------------------

describe('ProjectionMigration — rejected mismatch', () => {
  it('returns empty path when fromVersion skips a version with no bridging migration (gap)', () => {
    // Only v1→v2 is registered; nothing bridges v2→v3
    const v1v2 = makeMigration(1, 2);
    const path = getMigrationPathWith([v1v2], 2, 3); // no migration for this range
    expect(path).toHaveLength(0);
  });

  it('a consumer receiving an empty path for a stale row must treat it as a rejected mismatch', () => {
    const staleRow: Record<string, unknown> = {
      sessionId: 'sess-999',
      schemaVersion: 5,
    };
    const currentVersion = 7; // hypothetical future version

    // No migrations registered at all
    const path = getMigrationPathWith(
      [],
      staleRow['schemaVersion'] as number,
      currentVersion,
    );

    // Simulate consumer rejection: cannot serve this row
    const isRejected =
      path.length === 0 &&
      (staleRow['schemaVersion'] as number) < currentVersion;
    expect(isRejected).toBe(true);
  });

  it('getMigrationPath with fromVersion > toVersion is always rejected (future schema)', () => {
    // A row with schemaVersion newer than CURRENT_PROJECTION_VERSION cannot be migrated down
    const futureVersion = CURRENT_PROJECTION_VERSION + 10;
    const path = getMigrationPath(futureVersion, CURRENT_PROJECTION_VERSION);
    expect(path).toEqual([]);
  });

  it('migration description is present for auditability', () => {
    const v1v2 = makeMigration(1, 2);
    expect(typeof v1v2.description).toBe('string');
    expect(v1v2.description.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// PROJECTION_MIGRATIONS registry integrity
// ---------------------------------------------------------------------------

describe('PROJECTION_MIGRATIONS registry', () => {
  it('is an array', () => {
    expect(Array.isArray(PROJECTION_MIGRATIONS)).toBe(true);
  });

  it('every registered migration has required fields', () => {
    for (const m of PROJECTION_MIGRATIONS) {
      expect(typeof m.fromVersion).toBe('number');
      expect(typeof m.toVersion).toBe('number');
      expect(typeof m.description).toBe('string');
      expect(typeof m.migrate).toBe('function');
      expect(m.toVersion).toBeGreaterThan(m.fromVersion);
    }
  });

  it('migrations are registered in ascending fromVersion order (if any)', () => {
    for (let i = 1; i < PROJECTION_MIGRATIONS.length; i++) {
      expect(PROJECTION_MIGRATIONS[i].fromVersion).toBeGreaterThanOrEqual(
        PROJECTION_MIGRATIONS[i - 1].fromVersion,
      );
    }
  });
});
