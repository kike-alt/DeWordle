import { DataSource } from 'typeorm';
import { Word } from './games/dewordle/words/entities/word.entity';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

export const MigrationDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: true,
  entities: [Word], // Only include the Word entity for this migration
  migrations: ['dist/src/migrations/*.js'],
  migrationsTableName: 'migrations',
});
