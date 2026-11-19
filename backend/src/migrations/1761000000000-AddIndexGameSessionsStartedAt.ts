import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexGameSessionsStartedAt1761000000000 implements MigrationInterface {
  name = 'AddIndexGameSessionsStartedAt1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at
      ON game_sessions (started_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_game_sessions_started_at`);
  }
}
