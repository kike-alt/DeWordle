import { type MigrationInterface, type QueryRunner, Table } from 'typeorm';

export class CreateWordsTable1735056000000 implements MigrationInterface {
  name = 'CreateWordsTable1735056000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'words',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'text',
            type: 'varchar',
            length: '5',
            isUnique: true,
          },
          {
            name: 'isCommon',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_words_text',
            columnNames: ['text'],
          },
          {
            name: 'IDX_words_is_common',
            columnNames: ['isCommon'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('words');
  }
}
