import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddUserGameStatsStreakIndex1763600000000
  implements MigrationInterface
{
  name = 'AddUserGameStatsStreakIndex1763600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_game_stats_streak_rank"
      ON "user_game_stats" ("longestStreak" DESC, "currentStreak" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_user_game_stats_streak_rank"',
    );
  }
}
