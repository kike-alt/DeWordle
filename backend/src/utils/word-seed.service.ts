import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Word } from '../entities/word.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WordSeedService {
  private readonly logger = new Logger(WordSeedService.name);
  private wordRepository: Repository<Word>;

  constructor(
    @InjectRepository(Word)
    wordRepository?: Repository<Word>,
  ) {
    if (wordRepository) {
      this.wordRepository = wordRepository;
    }
  }

  // Method to set repository manually (for standalone scripts)
  setRepository(repository: Repository<Word>): void {
    this.wordRepository = repository;
  }

  // Static method to create service with DataSource (for standalone scripts)
  static createWithDataSource(dataSource: DataSource): WordSeedService {
    const service = new WordSeedService();
    service.setRepository(dataSource.getRepository(Word));
    return service;
  }

  async seedWords(force: boolean = false): Promise<void> {
    this.logger.log('Starting word seeding process...');

    try {
      // Check if words already exist
      const existingWordsCount = await this.wordRepository.count();
      if (existingWordsCount > 0 && !force) {
        this.logger.log(
          `Database already contains ${existingWordsCount} words. Skipping seeding.`,
        );
        return;
      }

      // If force is true and words exist, clear them first
      if (force && existingWordsCount > 0) {
        this.logger.log(
          `Force seeding enabled. Clearing existing ${existingWordsCount} words...`,
        );
        await this.wordRepository.clear();
        this.logger.log('Existing words cleared successfully.');
      }

      // Read the 5-letter words file
      const wordsFilePath = path.join(
        __dirname,
        '..',
        '..',
        'data',
        'five-letter-words.txt',
      );

      if (!fs.existsSync(wordsFilePath)) {
        throw new Error(`Words file not found at ${wordsFilePath}`);
      }

      const fileContent = fs.readFileSync(wordsFilePath, 'utf-8');
      const words = fileContent
        .split('\n')
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length === 5) // Ensure exactly 5 letters
        .filter((word) => /^[a-z]+$/.test(word)) // Only letters, no numbers or special chars
        .filter((word, index, array) => array.indexOf(word) === index); // Remove duplicates

      this.logger.log(`Found ${words.length} valid 5-letter words to seed`);

      // Prepare word entities
      const wordEntities = words.map((word) => {
        const wordEntity = new Word();
        wordEntity.word = word;
        return wordEntity;
      });

      // Batch insert words for better performance
      const batchSize = 100;
      let seededCount = 0;

      for (let i = 0; i < wordEntities.length; i += batchSize) {
        const batch = wordEntities.slice(i, i + batchSize);
        try {
          await this.wordRepository.insert(batch);
          seededCount += batch.length;
          this.logger.log(`Seeded ${seededCount}/${wordEntities.length} words`);
        } catch (error) {
          this.logger.error(
            `Error seeding batch ${i / batchSize + 1}:`,
            error.message,
          );
          // Continue with next batch
        }
      }

      this.logger.log(
        `Word seeding completed! Successfully seeded ${seededCount} words.`,
      );
    } catch (error) {
      this.logger.error('Error during word seeding:', error.message);
      throw error;
    }
  }

  async getRandomWord(): Promise<Word | null> {
    try {
      const count = await this.wordRepository.count();
      if (count === 0) {
        return null;
      }

      const randomIndex = Math.floor(Math.random() * count);
      const randomWord = await this.wordRepository
        .createQueryBuilder('word')
        .skip(randomIndex)
        .take(1)
        .getOne();

      return randomWord;
    } catch (error) {
      this.logger.error('Error getting random word:', error.message);
      return null;
    }
  }

  async getDailyWord(date: Date): Promise<Word | null> {
    try {
      // Check if there's already a daily word for this date
      const existingDailyWord = await this.wordRepository.findOne({
        where: {
          isDaily: true,
          dailyDate: date,
        },
      });

      if (existingDailyWord) {
        return existingDailyWord;
      }

      // Get a random word and mark it as daily word for this date
      const randomWord = await this.getRandomWord();
      if (!randomWord) {
        return null;
      }

      // Update the word to be the daily word
      await this.wordRepository.update(randomWord.id, {
        isDaily: true,
        dailyDate: date,
      });

      return await this.wordRepository.findOne({
        where: { id: randomWord.id },
      });
    } catch (error) {
      this.logger.error('Error getting daily word:', error.message);
      return null;
    }
  }

  async getTotalWordsCount(): Promise<number> {
    return await this.wordRepository.count();
  }

  async clearDailyWords(): Promise<void> {
    await this.wordRepository.update(
      { isDaily: true },
      { isDaily: false, dailyDate: undefined },
    );
    this.logger.log('Cleared all daily word assignments');
  }
}
