import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Word } from '../games/dewordle/words/entities/word.entity';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a minimal data source just for word seeding
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  entities: [Word], // Only include Word entity
  synchronize: true, // Enable to create table if it doesn't exist
  logging: true,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
});

async function seedWords() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    
    const wordRepository = AppDataSource.getRepository(Word);
    
    // Clear existing words
    const existingWords = await wordRepository.count();
    if (existingWords > 0) {
      console.log(`Clearing ${existingWords} existing words...`);
      await wordRepository.clear();
    }

    // Read words from file
    const filePath = join(process.cwd(), 'data', '5-letter-words.txt');
    console.log(`Reading words from: ${filePath}`);
    
    const fileContent = readFileSync(filePath, 'utf-8');
    const words = fileContent
      .split('\n')
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length === 5);

    console.log(`Found ${words.length} valid words`);

    // Create word entities with difficulty assignment
    const commonLetters = 'aeiourstlnm';
    const wordEntities = words.map(word => {
      let commonCount = 0;
      for (const letter of word) {
        if (commonLetters.includes(letter)) commonCount++;
      }
      
      let difficulty;
      if (commonCount >= 4) {
        difficulty = 1; // Easy
      } else if (commonCount >= 3) {
        difficulty = 2; // Medium  
      } else {
        difficulty = 3; // Hard
      }

      const wordEntity = new Word();
      wordEntity.text = word;
      wordEntity.category = 'common';
      wordEntity.difficulty = difficulty;
      return wordEntity;
    });

    // Save words in batches
    const batchSize = 100;
    for (let i = 0; i < wordEntities.length; i += batchSize) {
      const batch = wordEntities.slice(i, i + batchSize);
      await wordRepository.save(batch);
      console.log(`Saved batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(wordEntities.length/batchSize)}`);
    }

    console.log(`✅ Successfully seeded ${wordEntities.length} words!`);
    
    // Show difficulty distribution
    const easyCount = await wordRepository.count({ where: { difficulty: 1 } });
    const mediumCount = await wordRepository.count({ where: { difficulty: 2 } });
    const hardCount = await wordRepository.count({ where: { difficulty: 3 } });
    
    console.log(`Difficulty distribution:`);
    console.log(`  Easy: ${easyCount} words`);
    console.log(`  Medium: ${mediumCount} words`);
    console.log(`  Hard: ${hardCount} words`);
    
  } catch (error) {
    console.error('❌ Error seeding words:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
}

// Run the seeding
seedWords();