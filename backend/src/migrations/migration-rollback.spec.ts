/**
 * Migration rollback verification (#1548).
 *
 * For every migration in this directory: build the schema the migration
 * expects, seed a row, run it forward with the TypeORM runner, roll it back
 * with `undoLastMigration`, then assert the schema is identical to the
 * pre-migration snapshot and the seeded row survived.
 *
 * Needs a throw-away PostgreSQL database:
 *
 *   MIGRATION_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/dewordle_migtest \
 *     npx jest src/migrations/migration-rollback.spec.ts
 *
 * The schema is dropped between cases, so the database name must contain
 * "test". Without the variable the suite is skipped. Timings are written to
 * MIGRATION_TIMINGS_FILE (default: the OS temp dir) and printed at the end.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DataSource, type MigrationInterface } from 'typeorm';

const URL = process.env.MIGRATION_TEST_DATABASE_URL;
const MIGRATIONS_DIR = __dirname;

interface Case {
  /** Prerequisite schema, i.e. the state before the migration is applied. */
  baseline: string[];
  /** Rows inserted before `up`. Omit when `up` itself cannot accept data. */
  seed?: string[];
  /** Read-only query proving the seeded data is intact afterwards. */
  verify?: { sql: string; expected: unknown[] };
  /** Why no seed is used, shown in the test title. */
  noSeedReason?: string;
}

const WORDS_BASELINE = (len: number) => [
  `CREATE TABLE "words" ("id" SERIAL PRIMARY KEY, "word" character varying(${len}) NOT NULL)`,
  `ALTER TABLE "words" ADD CONSTRAINT "UQ_38a98e41b6be0f379166dc2b58d" UNIQUE ("word")`,
  `CREATE INDEX "IDX_38a98e41b6be0f379166dc2b58" ON "words" ("word")`,
];
const WORD_SEED = [`INSERT INTO "words" ("word") VALUES ('crane')`];
const WORD_VERIFY = { sql: `SELECT "word" FROM "words"`, expected: [{ word: 'crane' }] };
const GAME_SESSION = `CREATE TABLE "game_session" ("id" SERIAL PRIMARY KEY)`;

const CASES: Record<string, Case> = {
  CreateTestEntity1703000000000: { baseline: [] },
  CreateWordsTable1704000000000: { baseline: [] },
  CreateWordsTable1735056000000: { baseline: [] },
  UpdateGameSessionTable1753390184956: {
    baseline: [GAME_SESSION],
    noSeedReason: 'up adds a NOT NULL column without a default',
  },
  CreateGuessHistory1753519314008: {
    baseline: [`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, GAME_SESSION],
    seed: [`INSERT INTO "game_session" DEFAULT VALUES`],
    verify: { sql: `SELECT "id" FROM "game_session"`, expected: [{ id: 1 }] },
  },
  AddStatusGameSession1753526424485: {
    baseline: [
      `CREATE TABLE "game_session" ("id" SERIAL PRIMARY KEY, "solution" character varying(5) NOT NULL)`,
    ],
    seed: [`INSERT INTO "game_session" ("solution") VALUES ('crane')`],
    verify: {
      sql: `SELECT "solution" FROM "game_session"`,
      expected: [{ solution: 'crane' }],
    },
  },
  AddDifficultyToWord1753545965294: {
    baseline: WORDS_BASELINE(5),
    seed: WORD_SEED,
    verify: WORD_VERIFY,
  },
  AddRejectedWords1755091976283: {
    baseline: WORDS_BASELINE(10),
    seed: WORD_SEED,
    verify: WORD_VERIFY,
  },
  AddIsEnrichedToWord1755770425259: {
    baseline: [`CREATE TABLE "words" ("id" SERIAL PRIMARY KEY, "word" character varying(10) NOT NULL)`],
    seed: WORD_SEED,
    verify: WORD_VERIFY,
  },
  AddProjectionQueryIndexes1757000000000: {
    baseline: [
      `CREATE TABLE "session_projections" ("id" SERIAL PRIMARY KEY, "player" text, "dayId" int, "status" text, "network" text)`,
      `CREATE TABLE "indexer_cursors" ("id" SERIAL PRIMARY KEY, "lastLedger" int, "updatedAt" timestamp)`,
      `CREATE TABLE "ingested_events" ("id" SERIAL PRIMARY KEY, "topic" text, "ledger" int, "createdAt" timestamp, "network" text)`,
    ],
    seed: [`INSERT INTO "session_projections" ("player", "dayId", "status", "network") VALUES ('p', 1, 's', 'testnet')`],
    verify: {
      sql: `SELECT "player" FROM "session_projections"`,
      expected: [{ player: 'p' }],
    },
  },
  AddWeeklyDigest1759100000000: {
    baseline: [
      `CREATE TABLE "users" ("id" SERIAL PRIMARY KEY, "email" character varying NOT NULL)`,
    ],
    seed: [`INSERT INTO "users" ("email") VALUES ('a@b.io')`],
    verify: { sql: `SELECT "email" FROM "users"`, expected: [{ email: 'a@b.io' }] },
  },
  AddGinIndexGameSessionsMetadata1758000000000: {
    baseline: [`CREATE TABLE "game_sessions" ("id" SERIAL PRIMARY KEY, "metadata" jsonb)`],
    seed: [`INSERT INTO "game_sessions" ("metadata") VALUES ('{"guestId":"g"}')`],
    verify: {
      sql: `SELECT "metadata" FROM "game_sessions"`,
      expected: [{ metadata: { guestId: 'g' } }],
    },
  },
  AddUserGameStatsStreakIndex1763600000000: {
    baseline: [
      `CREATE TABLE "user_game_stats" ("id" SERIAL PRIMARY KEY, "longestStreak" integer, "currentStreak" integer)`,
    ],
  },
};

function discoverMigrations(): { name: string; file: string; cls: new () => MigrationInterface }[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+-.*\.ts$/.test(f) && !f.endsWith('.spec.ts'))
    .sort()
    .map((f) => {
      const mod = require(path.join(MIGRATIONS_DIR, f)) as Record<string, new () => MigrationInterface>;
      const cls = Object.values(mod).find((v) => typeof v === 'function')!;
      return { name: cls.name, file: f, cls };
    });
}

async function snapshot(ds: DataSource): Promise<unknown> {
  const q = (sql: string) => ds.query(sql) as Promise<unknown[]>;
  return {
    columns: await q(`
      SELECT table_name, column_name, data_type, udt_name, character_maximum_length,
             is_nullable, column_default
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name <> 'migrations'
       ORDER BY table_name, column_name`),
    indexes: await q(`
      SELECT tablename, indexname, indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND tablename <> 'migrations'
       ORDER BY tablename, indexname`),
    constraints: await q(`
      SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS def
        FROM pg_constraint
       WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text <> 'migrations'
       ORDER BY 1, 2`),
    enums: await q(`
      SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
        FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typnamespace = 'public'::regnamespace
       GROUP BY t.typname ORDER BY t.typname`),
  };
}

const run = URL ? describe : describe.skip;

run('migration rollback (#1548)', () => {
  const migrations = discoverMigrations();
  const timings: { migration: string; upMs: number; downMs: number }[] = [];

  beforeAll(() => {
    const dbName = new globalThis.URL(URL!).pathname.slice(1);
    if (!/test/i.test(dbName)) {
      throw new Error(
        `Refusing to drop the public schema of "${dbName}": the database name must contain "test".`,
      );
    }
  });

  afterAll(() => {
    const file =
      process.env.MIGRATION_TIMINGS_FILE ??
      path.join(os.tmpdir(), 'dewordle-migration-timings.json');
    fs.writeFileSync(file, JSON.stringify(timings, null, 2));
    // eslint-disable-next-line no-console
    console.table(timings);
  });

  it('has a rollback case for every migration file', () => {
    expect(migrations.map((m) => m.name).sort()).toEqual(Object.keys(CASES).sort());
  });

  for (const { name, cls } of migrations) {
    const spec = CASES[name];
    if (!spec) continue;
    const title = spec.noSeedReason
      ? `${name}: up/down restores schema (no data check: ${spec.noSeedReason})`
      : `${name}: up/down restores schema and keeps data`;

    it(title, async () => {
      const ds = new DataSource({ type: 'postgres', url: URL, migrations: [cls] });
      await ds.initialize();
      try {
        await ds.query('DROP SCHEMA public CASCADE');
        await ds.query('CREATE SCHEMA public');
        for (const sql of spec.baseline) await ds.query(sql);
        for (const sql of spec.seed ?? []) await ds.query(sql);

        const before = await snapshot(ds);

        const upStart = process.hrtime.bigint();
        const applied = await ds.runMigrations({ transaction: 'each' });
        const upMs = Number(process.hrtime.bigint() - upStart) / 1e6;
        expect(applied.map((m) => m.name)).toEqual([name]);

        const migrated = await snapshot(ds);
        expect(migrated).not.toEqual(before);

        const downStart = process.hrtime.bigint();
        // TypeORM's revert ignores a migration's own `transaction = false`, so
        // such migrations must be reverted with `--transaction none`.
        const revertMode =
          (new cls() as { transaction?: boolean }).transaction === false
            ? 'none'
            : 'each';
        await ds.undoLastMigration({ transaction: revertMode });
        const downMs = Number(process.hrtime.bigint() - downStart) / 1e6;

        expect(await snapshot(ds)).toEqual(before);
        if (spec.verify) {
          expect(await ds.query(spec.verify.sql)).toEqual(spec.verify.expected);
        }
        timings.push({
          migration: name,
          upMs: Math.round(upMs * 10) / 10,
          downMs: Math.round(downMs * 10) / 10,
        });
      } finally {
        await ds.destroy();
      }
    });
  }
});
