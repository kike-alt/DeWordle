import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddRejectedWords1755091976283 implements MigrationInterface {
  name = 'AddRejectedWords1755091976283';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"public\".\"words_status_enum\" AS ENUM('pending', 'approved', 'rejected', 'review')",
    );
    await queryRunner.query(
      'ALTER TABLE "words" ADD "status" "public"."words_status_enum" NOT NULL DEFAULT \'pending\'',
    );
    await queryRunner.query(
      'ALTER TABLE "words" ADD "qualityScore" double precision',
    );
    await queryRunner.query('ALTER TABLE "words" ADD "sources" text array');
    await queryRunner.query(
      'DROP INDEX "public"."IDX_38a98e41b6be0f379166dc2b58"',
    );
    await queryRunner.query(
      'ALTER TABLE "words" DROP CONSTRAINT "UQ_38a98e41b6be0f379166dc2b58d"',
    );
    await queryRunner.query(
      'ALTER TABLE "words" ALTER COLUMN "word" TYPE character varying(50)',
    );
    await queryRunner.query(
      'ALTER TABLE "words" ADD CONSTRAINT "UQ_38a98e41b6be0f379166dc2b58d" UNIQUE ("word")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_38a98e41b6be0f379166dc2b58" ON "words" ("word")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_38a98e41b6be0f379166dc2b58"',
    );
    await queryRunner.query(
      'ALTER TABLE "words" DROP CONSTRAINT "UQ_38a98e41b6be0f379166dc2b58d"',
    );
    await queryRunner.query('ALTER TABLE "words" DROP COLUMN "word"');
    await queryRunner.query(
      'ALTER TABLE "words" ADD "word" character varying(10) NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "words" ADD CONSTRAINT "UQ_38a98e41b6be0f379166dc2b58d" UNIQUE ("word")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_38a98e41b6be0f379166dc2b58" ON "words" ("word")',
    );
    await queryRunner.query('ALTER TABLE "words" DROP COLUMN "sources"');
    await queryRunner.query('ALTER TABLE "words" DROP COLUMN "qualityScore"');
    await queryRunner.query('ALTER TABLE "words" DROP COLUMN "status"');
    await queryRunner.query('DROP TYPE "public"."words_status_enum"');
  }
}
