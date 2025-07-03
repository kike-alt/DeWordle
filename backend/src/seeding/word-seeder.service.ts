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
      // Check if words already exist
      const existingWords = await this.wordRepository.count();
      if (existingWords > 0) {
        this.logger.log(`Database already contains ${existingWords} words. Skipping seeding.`);
        return;
      }

      // Read words from file
      const filePath = join(process.cwd(), 'data', '5-letter-words.txt');
      const fileContent = readFileSync(filePath, 'utf-8');
      const words = fileContent
        .split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length === 5);

      // Prepare word entities
      const wordEntities = words.map(word => {
        const wordEntity = new Word();
        wordEntity.text = word;
        wordEntity.category = 'common'; // Default category
        wordEntity.difficulty = 1; // Default difficulty
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
}
