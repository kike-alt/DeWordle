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
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
});

function assignDifficulty(word: string): number {
  const commonLetters = 'aeiourstlnm';
  let commonCount = 0;
  
  for (const letter of word) {
    if (commonLetters.includes(letter)) {
      commonCount++;
    }
  }
  
  // Assign difficulty based on common letter count
  if (commonCount >= 4) {
    return 1; // Easy - mostly common letters
  } else if (commonCount >= 2) {
    return 2; // Medium - some common letters
  } else {
    return 3; // Hard - few common letters
  }
}

async function seedWords() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    
    console.log('Reading words from file...');
    const filePath = join(process.cwd(), 'data', '5-letter-words.txt');
    const fileContent = readFileSync(filePath, 'utf-8');
    
    const words = fileContent
      .split('\n')
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length === 5)
      .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
    
    console.log(`Found ${words.length} unique 5-letter words`);
    
    // Clear existing words
    console.log('Clearing existing words...');
    const wordRepository = AppDataSource.getRepository(Word);
    await wordRepository.clear();
    
    // Prepare words with difficulty levels
    const wordEntities = words.map(wordText => {
      const word = new Word();
      word.text = wordText;
      word.difficulty = assignDifficulty(wordText);
      return word;
    });
    
    // Insert words in batches
    console.log('Inserting words into database...');
    const batchSize = 100;
    for (let i = 0; i < wordEntities.length; i += batchSize) {
      const batch = wordEntities.slice(i, i + batchSize);
      await wordRepository.save(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(wordEntities.length / batchSize)}`);
    }
    
    // Show difficulty distribution
    const difficultyStats = { 1: 0, 2: 0, 3: 0 };
    wordEntities.forEach(word => {
      difficultyStats[word.difficulty]++;
    });
    
    console.log('\n✅ Seeding completed successfully!');
    console.log(`📊 Total words: ${wordEntities.length}`);
    console.log(`🟢 Easy (${difficultyStats[1]}), 🟡 Medium (${difficultyStats[2]}), 🔴 Hard (${difficultyStats[3]})`);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the seeder
seedWords().catch(console.error);