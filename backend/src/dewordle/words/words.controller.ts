import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WordsService } from './words.service';
import { Word } from '../../entities/word.entity';

@ApiTags('words')
@Controller('words')
export class WordsController {
  private readonly logger = new Logger(WordsController.name);

  constructor(private readonly wordsService: WordsService) {}

  @Get('test')
  test(): string {
    return this.wordsService.test();
  }

  @Get('random')
  @ApiOperation({
    summary: 'Get a random enriched word',
    description:
      'Returns a random word with dictionary metadata including definition, example, part of speech, and phonetics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Random enriched word retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        word: { type: 'string', example: 'crane' },
        definition: {
          type: 'string',
          example: 'A large bird with a long neck...',
        },
        example: {
          type: 'string',
          example: 'The crane lifted the heavy cargo.',
        },
        partOfSpeech: { type: 'string', example: 'noun' },
        phonetics: { type: 'string', example: '/kreɪn/', nullable: true },
        isEnriched: { type: 'boolean', example: true },
      },
    },
  })
  async getRandomWord() {
    const startTime = Date.now();

    try {
      const word = await this.wordsService.getRandomWord();
      const responseTime = Date.now() - startTime;

      this.logger.log(`Random word request completed in ${responseTime}ms`);

      if (responseTime > 500) {
        this.logger.warn(
          `Slow response time: ${responseTime}ms for random word request`,
        );
      }

      return word;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Random word request failed after ${responseTime}ms:`,
        error,
      );
      throw error;
    }
  }

  @Post('enrich')
  @ApiOperation({
    summary: 'Enrich a word with dictionary data',
    description: 'Fetches and stores dictionary metadata for a given word',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Word enriched successfully',
  })
  async enrichWord(@Body('word') word: string): Promise<Word> {
    this.logger.log(`Enriching word: ${word}`);
    return await this.wordsService.enrichWord(word);
  }

  @Get()
  @ApiOperation({ summary: 'Get all words' })
  async findAll(): Promise<Word[]> {
    return await this.wordsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get word by ID' })
  async findOne(@Param('id') id: string): Promise<Word> {
    return await this.wordsService.findOne(id);
  }
}
