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
    @Param('difficulty') difficulty: number,
    @Query('category') category?: string,
  ) {
    return this.wordsService.getRandomWordByDifficulty(+difficulty, category);
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
