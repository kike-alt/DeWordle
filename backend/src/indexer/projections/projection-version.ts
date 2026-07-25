/**
 * Projection schema versioning and migration strategy hooks.
 *
 * Increment CURRENT_PROJECTION_VERSION whenever the shape of
 * SessionProjectionEntity changes in a way that would make existing rows
 * incompatible with new read paths. Consumers can detect stale rows by
 * comparing their stored schemaVersion against CURRENT_PROJECTION_VERSION.
 *
 * Migration flow:
 *  1. Bump CURRENT_PROJECTION_VERSION.
 *  2. Implement a ProjectionMigration that handles the (from → to) transition.
 *  3. Register it in PROJECTION_MIGRATIONS.
 *  4. The migration runner picks it up automatically at startup.
 */
export const CURRENT_PROJECTION_VERSION = 1;

/**
 * Describes a single projection schema migration.
 * Implementations are expected to be idempotent — re-running a migration on
 * an already-migrated row must be a no-op.
 */
export interface ProjectionMigration {
  /** Version this migration upgrades FROM. */
  fromVersion: number;
  /** Version this migration upgrades TO. */
  toVersion: number;
  /** Human-readable description surfaced in logs. */
  description: string;
  /**
   * Apply the migration to a single raw projection row.
   * Returns the mutated row (may be the same object).
   */
  migrate(row: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Registry of all known projection migrations, ordered ascending by
 * fromVersion. Add new migrations here; the runner applies them in order.
 */
export const PROJECTION_MIGRATIONS: ProjectionMigration[] = [
  // Example for the next version bump:
  // {
  //   fromVersion: 1,
  //   toVersion: 2,
  //   description: 'Back-fill rewardAmount from attemptsUsed scoring table',
  //   migrate(row) {
  //     row.rewardAmount ??= 0;
  //     return row;
  //   },
  // },
];

/**
 * Returns the ordered chain of migrations needed to advance a row from
 * `fromVersion` to `toVersion`. Returns an empty array if already current.
 */
export function getMigrationPath(
  fromVersion: number,
  toVersion: number,
): ProjectionMigration[] {
  if (fromVersion >= toVersion) return [];
  return PROJECTION_MIGRATIONS.filter(
    (m) => m.fromVersion >= fromVersion && m.toVersion <= toVersion,
  ).sort((a, b) => a.fromVersion - b.fromVersion);
}
