import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EnrichedWord } from '../../utils/dictionary.helper';
import { WordScheduler } from './word.scheduler';

@Controller('words')
export class WordsController {
  private readonly logger = new Logger(WordsController.name);

  constructor(
    private readonly wordsService: WordsService,
    private readonly wordScheduler: WordScheduler,
  ) {}

  @Get('test')
  test(): string {
    return this.wordsService.test();
  }

  @Get('random')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a random 5-letter word with enriched metadata',
    description:
      'Returns a random 5-letter word enriched with definition, example, part of speech, and phonetics from dictionary API',
  })
  @ApiResponse({
    status: 200,
    description: 'Random enriched word returned',
    schema: {
      example: {
        id: 'uuid-string',
        word: 'crane',
        definition: 'A large bird with a long neck...',
        example: 'The crane lifted the heavy cargo.',
        partOfSpeech: 'noun',
        phonetics: '/kreɪn/',
        isEnriched: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No 5-letter words found in database',
  })
  async getRandomWord(): Promise<EnrichedWord> {
    this.logger.log('Received request for a random enriched word.');
    try {
      return await this.wordsService.getRandomWord();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error fetching random word: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace available',
      );
      throw new NotFoundException(
        'Could not retrieve a random word at this time due to an internal issue.',
      );
    }
  }

  @Get('daily')
  @ApiOperation({
    summary: 'Get today\'s daily word',
    description: 'Returns the current daily word if one has been generated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily word retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'No daily word found for today.',
  })
  async getDailyWord() {
    return this.wordsService.getTodaysWord();
  }

  @Post('daily/trigger')
  @ApiOperation({
    summary: 'Trigger manual daily word generation',
    description:
      'Manually triggers the daily word generation process. Useful for testing or fallback if Cron fails.',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual trigger executed successfully.',
    schema: {
      example: { status: 'Triggered' },
    },
  })
  async triggerManual() {
    await this.wordScheduler.ensureTodayWord();
    return { status: 'Triggered' };
  }

  @Get('daily/health')
  @ApiOperation({
    summary: 'Check daily word job health status',
    description: 'Returns status indicating whether the daily word job has run today.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check information returned successfully.',
    schema: {
      example: {
        success: true,
        message: 'Daily word already exists for today',
        date: '2025-07-23T00:00:00.000Z',
        word: 'vigor',
      },
    },
  })
  async healthCheck() {
    return this.wordsService.getHealthStatus();
  }

  @Get('cache/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get cache performance statistics',
    description: 'Returns cache hit rates, performance metrics, and optimization status',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics returned successfully',
    schema: {
      example: {
        cacheHits: 45,
        cacheMisses: 5,
        totalRequests: 50,
        hitRate: '90.00%',
        uptime: '2.5 hours',
        performance: {
          isOptimal: true,
          targetHitRate: '90%',
          currentStatus: 'OPTIMAL'
        }
      },
    },
  })
  async getCacheStats() {
    this.logger.log('Received request for cache statistics.');
    return this.wordsService.getCacheStats();
  }

}
