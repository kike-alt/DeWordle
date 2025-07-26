import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddIsEnrichedToWords1735400000000 implements MigrationInterface {
  name = 'AddIsEnrichedToWords1735400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "words" ADD "isEnriched" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_words_isEnriched" ON "words" ("isEnriched")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_words_isEnriched"`);
    await queryRunner.query(`ALTER TABLE "words" DROP COLUMN "isEnriched"`);
  }
} 