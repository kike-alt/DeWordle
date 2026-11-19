import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiredGameSessionStatus1762000000000
  implements MigrationInterface
{
  name = 'AddExpiredGameSessionStatus1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."game_session_status_enum" ADD VALUE 'EXPIRED'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing a value from an enum type.
  }
}
