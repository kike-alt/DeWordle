import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from '../games/dewordle/words/entities/word.entity';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class WordSeederService {
  private readonly logger = new Logger(WordSeederService.name);

  constructor(
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
  ) {}

  async seedWords(): Promise<void> {
    try {
      // Clear existing words to re-seed with difficulty levels
      const existingWords = await this.wordRepository.count();
      if (existingWords > 0) {
        this.logger.log('Clearing existing words to re-seed with difficulty levels...');
        await this.wordRepository.clear();
      }

      // Read words from file
      const filePath = join(process.cwd(), 'data', '5-letter-words.txt');
      const fileContent = readFileSync(filePath, 'utf-8');
      const words = fileContent
        .split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length === 5);

      // Prepare word entities with difficulty assignment
      const wordEntities = words.map(word => {
        const wordEntity = new Word();
        wordEntity.text = word;
        wordEntity.category = 'common'; // Mark all as common for now
        
        // Assign difficulty based on word characteristics
        // More balanced distribution based on common letter count
        const commonLetters = 'aeiourstlnm';
        
        let commonCount = 0;
        for (const letter of word) {
          if (commonLetters.includes(letter)) commonCount++;
        }
        
        // New balanced thresholds based on analysis:
        // 5 common letters = easy (1) - about 11% of words
        // 4 common letters = easy (1) - about 40% of words  
        // 3 common letters = medium (2) - about 38% of words
        // 1-2 common letters = hard (3) - about 11% of words
        if (commonCount >= 4) {
          wordEntity.difficulty = 1; // Easy - 4+ common letters
        } else if (commonCount >= 3) {
          wordEntity.difficulty = 2; // Medium - 3 common letters  
        } else {
          wordEntity.difficulty = 3; // Hard - 1-2 common letters
        }
        
        return wordEntity;
      });

      // Save words to database
      await this.wordRepository.save(wordEntities);
      
      this.logger.log(`Successfully seeded ${wordEntities.length} words`);
    } catch (error) {
      this.logger.error('Error seeding words:', error);
      throw error;
    }
  }

  async getRandomWord(): Promise<Word> {
    const count = await this.wordRepository.count();
    if (count === 0) {
      throw new Error('No words available. Please seed the database first.');
    }

    const randomIndex = Math.floor(Math.random() * count);
    const word = await this.wordRepository
      .createQueryBuilder('word')
      .skip(randomIndex)
      .take(1)
      .getOne();

    if (!word) {
      throw new Error('Failed to retrieve random word');
    }

    return word;
  }

  async isValidWord(word: string): Promise<boolean> {
    const wordEntity = await this.wordRepository.findOne({
      where: { text: word.toLowerCase() }
    });
    return !!wordEntity;
  }

  async getRandomWordByDifficulty(difficulty: number = 1, category?: string): Promise<Word> {
    const queryBuilder = this.wordRepository.createQueryBuilder('word');
    
    // Filter by difficulty
    queryBuilder.where('word.difficulty = :difficulty', { difficulty });
    
    // Filter by category if provided
    if (category) {
      queryBuilder.andWhere('word.category = :category', { category });
    }

    const count = await queryBuilder.getCount();
    if (count === 0) {
      throw new Error(`No words available with difficulty ${difficulty}${category ? ` and category ${category}` : ''}. Please seed the database first.`);
    }

    const randomIndex = Math.floor(Math.random() * count);
    const word = await queryBuilder
      .skip(randomIndex)
      .take(1)
      .getOne();

    if (!word) {
      throw new Error('Failed to retrieve random word');
    }

    return word;
  }
}
