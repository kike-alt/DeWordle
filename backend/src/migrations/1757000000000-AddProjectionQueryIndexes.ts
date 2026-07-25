import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddProjectionQueryIndexes1757000000000
  implements MigrationInterface
{
  name = 'AddProjectionQueryIndexes1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_session_projections_player" ON "session_projections" ("player")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_session_projections_day_id" ON "session_projections" ("dayId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_session_projections_status" ON "session_projections" ("status")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_session_projections_network_player" ON "session_projections" ("network", "player")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_session_projections_network_status" ON "session_projections" ("network", "status")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_indexer_cursors_last_ledger" ON "indexer_cursors" ("lastLedger")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_indexer_cursors_updated_at" ON "indexer_cursors" ("updatedAt")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_ingested_events_topic" ON "ingested_events" ("topic")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_ingested_events_ledger" ON "ingested_events" ("ledger")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_ingested_events_created_at" ON "ingested_events" ("createdAt")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_ingested_events_network_topic" ON "ingested_events" ("network", "topic")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_session_projections_player"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_session_projections_day_id"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_session_projections_status"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_session_projections_network_player"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_session_projections_network_status"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_indexer_cursors_last_ledger"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_indexer_cursors_updated_at"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_ingested_events_topic"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_ingested_events_ledger"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_ingested_events_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_ingested_events_network_topic"',
    );
  }
}
