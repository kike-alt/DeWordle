import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateWordleSessionsTable1737215000000
  implements MigrationInterface
{
  name = 'CreateWordleSessionsTable1737215000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'wordle_sessions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'targetWordId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'guessHistory',
            type: 'json',
            default: "'[]'",
          },
          {
            name: 'isCompleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isWon',
            type: 'boolean',
            default: false,
          },
          {
            name: 'attemptsRemaining',
            type: 'int',
            default: 6,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['targetWordId'],
            referencedTableName: 'words',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_wordle_sessions_user_id',
            columnNames: ['userId'],
          },
          {
            name: 'IDX_wordle_sessions_target_word_id',
            columnNames: ['targetWordId'],
          },
          {
            name: 'IDX_wordle_sessions_is_completed',
            columnNames: ['isCompleted'],
          },
          {
            name: 'IDX_wordle_sessions_created_at',
            columnNames: ['createdAt'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('wordle_sessions');
  }
}
