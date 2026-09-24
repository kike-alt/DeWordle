import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGinIndexGameSessionsMetadata1758000000000 implements MigrationInterface {
  name = 'AddGinIndexGameSessionsMetadata1758000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_metadata_gin
      ON game_sessions USING GIN (metadata jsonb_path_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_game_sessions_metadata_gin`);
  }
}
