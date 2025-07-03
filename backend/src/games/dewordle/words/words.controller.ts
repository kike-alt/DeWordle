import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WordsService } from './words.service';

@Controller('/words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get('daily')
  getWordOfTheDay() {
    const word = this.wordsService.getWordOfTheDay();
    return { word };
  }

  @Get('guess/:word')
  validateGuess(@Param('word') word: string) {
    return this.wordsService.validateGuess(word);
  }

  @Get('random/:difficulty')
  getRandomWordByDifficulty(
    @Param('difficulty') difficulty: string,
    @Query('category') category?: string,
  ) {
    // Map string difficulty to number
    const difficultyMap: Record<string, number> = {
      'easy': 1,
      'medium': 2,
      'hard': 3
    };
    
    const difficultyNum = difficultyMap[difficulty.toLowerCase()] || parseInt(difficulty) || 1;
    return this.wordsService.getRandomWordByDifficulty(difficultyNum, category);
  }

  @Post('seed')
  async seedWords() {
    const words = ['apple', 'banana', 'xylophone', 'jazz', 'zebra', 'queue'];
    for (const word of words) {
      await this.wordsService.addWord(word);
    }
    return { message: 'Words seeded.' };
  }
}
