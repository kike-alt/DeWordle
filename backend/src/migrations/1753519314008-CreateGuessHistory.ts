import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateGuessHistory1753519314008 implements MigrationInterface {
  name = 'CreateGuessHistory1753519314008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "guess_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "guess" character varying(5) NOT NULL, "result" jsonb NOT NULL, "attemptNumber" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "sessionId" integer, CONSTRAINT "PK_b8c4ee55e79e548493786bfc88c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f570c47e2569605463e060d102" ON "guess_history" ("sessionId", "attemptNumber") `,
    );
    await queryRunner.query(
      `ALTER TABLE "guess_history" ADD CONSTRAINT "FK_bb7a73e1a2781155f522d68faac" FOREIGN KEY ("sessionId") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guess_history" DROP CONSTRAINT "FK_bb7a73e1a2781155f522d68faac"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f570c47e2569605463e060d102"`,
    );
    await queryRunner.query(`DROP TABLE "guess_history"`);
  }
}
