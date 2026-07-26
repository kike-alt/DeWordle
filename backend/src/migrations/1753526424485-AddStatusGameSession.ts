import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddStatusGameSession1753526424485 implements MigrationInterface {
  name = 'AddStatusGameSession1753526424485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."game_session_status_enum" AS ENUM('IN_PROGRESS', 'WON', 'LOST')`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_session" ADD "status" "public"."game_session_status_enum" NOT NULL DEFAULT 'IN_PROGRESS'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "game_session" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."game_session_status_enum"`);
  }
}
