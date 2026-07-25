import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddIsEnrichedToWord1755770425259 implements MigrationInterface {
  name = 'AddIsEnrichedToWord1755770425259';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "words" ADD "metadata" jsonb');
    await queryRunner.query(
      'ALTER TABLE "words" ADD "isEnriched" boolean NOT NULL DEFAULT false',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "words" DROP COLUMN "isEnriched"');
    await queryRunner.query('ALTER TABLE "words" DROP COLUMN "metadata"');
  }
}
