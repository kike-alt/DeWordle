import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class UpdateGameSessionTable1753390184956 implements MigrationInterface {
  name = 'UpdateGameSessionTable1753390184956';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_session" ADD "solution" character varying(5) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_session" DROP COLUMN "solution"`,
    );
  }
}
