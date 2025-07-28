import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DictionaryService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryService.name);
  private validWords = new Set<string>();

  onModuleInit() {
    this.loadDictionary();
  }

  /**
   * Load the dictionary from the five-letter-words.txt file
   */
  private loadDictionary(): void {
    try {
      const dictionaryPath = join(
        process.cwd(),
        'data',
        'five-letter-words.txt',
      );
      const fileContent = readFileSync(dictionaryPath, 'utf-8');

      const words = fileContent
        .split('\n')
        .map((word) => word.trim().toUpperCase())
        .filter((word) => word.length === 5);

      this.validWords = new Set(words);

      this.logger.log(
        `Loaded ${this.validWords.size} valid words from dictionary`,
      );
    } catch (error) {
      this.logger.error('Failed to load dictionary:', error);
      throw new Error('Failed to load word dictionary');
    }
  }

  /**
   * Check if a word is valid (exists in the dictionary)
   * @param word - The word to validate
   * @returns boolean - True if the word is valid
   */
  isValidWord(word: string): boolean {
    const normalizedWord = word.trim().toUpperCase();
    return this.validWords.has(normalizedWord);
  }

  /**
   * Get the total number of valid words in the dictionary
   * @returns number - Count of valid words
   */
  getWordCount(): number {
    return this.validWords.size;
  }
}
