import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Word } from './entities/word.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class WordsService {
  private wordOfTheDay: string = '';

  constructor(
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
  ) {
    this.generateWordOfTheDay();
    setInterval(() => this.generateWordOfTheDay(), 24 * 60 * 60 * 1000);
  }

  // Generate word of the day
  async generateWordOfTheDay() {
    try {
      const word = await this.getRandomWord();
      this.wordOfTheDay = word?.text || 'apple';
    } catch (error) {
      console.error('Error getting word of the day:', error);
      this.wordOfTheDay = 'apple';
    }
  }

  getWordOfTheDay() {
    return this.wordOfTheDay;
  }

  validateGuess(guess: string): { correct: boolean; hint: string } {
    let hint = '';
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === this.wordOfTheDay[i]) {
        hint += '🟩';
      } else if (this.wordOfTheDay.includes(guess[i])) {
        hint += '🟨';
      } else {
        hint += '⬜';
      }
    }
    return { correct: guess === this.wordOfTheDay, hint };
  }

  // Get a random word
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

  // Get a random word by difficulty
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

  // Add a new word
  async addWord(text: string, category?: string) {
    const word = this.wordRepository.create({ text, category, difficulty: 1 });
    return this.wordRepository.save(word);
  }
}
