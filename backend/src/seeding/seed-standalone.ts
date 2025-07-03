import { DataSource } from 'typeorm';
import { Word } from '../games/dewordle/words/entities/word.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Create a standalone DataSource for seeding
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  entities: [Word],
  synchronize: true,
  logging: false,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
});

async function seedWords() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');

    const wordRepository = AppDataSource.getRepository(Word);

    // Clear existing words and reseed with comprehensive list
    console.log('Clearing existing words...');
    await wordRepository.clear();

    // Read the word list
    const wordsFilePath = path.join(__dirname, '../../data/5-letter-words.txt');
    const fileContent = fs.readFileSync(wordsFilePath, 'utf-8');
    const allWords = fileContent
      .split('\n')
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length === 5);

    // Remove duplicates using Set
    const uniqueWords = [...new Set(allWords)];
    console.log(`Found ${uniqueWords.length} unique words to seed (${allWords.length - uniqueWords.length} duplicates removed)...`);

    // Batch insert words
    const batchSize = 100;
    for (let i = 0; i < uniqueWords.length; i += batchSize) {
      const batch = uniqueWords.slice(i, i + batchSize);
      const wordEntities = batch.map(word => {
        const wordEntity = new Word();
        wordEntity.text = word;
        wordEntity.category = 'common';
        wordEntity.difficulty = 1;
        return wordEntity;
      });

      await wordRepository.save(wordEntities);
      console.log(`Seeded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueWords.length / batchSize)}`);
    }

    console.log(`Successfully seeded ${uniqueWords.length} words!`);
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

seedWords();
