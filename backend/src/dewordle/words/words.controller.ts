import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WordsService } from './words.service';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { EnrichedWord } from '../../utils/dictionary.helper';
import { WordScheduler } from './word.scheduler';
import { JwtAuthGuard } from '../../auth/guards/jwt-guard.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorators';
import { CreateWordDto } from './dto/create-word.dto';
import { ValidateWordDto } from './dto/validate-word.dto';
import { WordResponseDto } from './dto/word-response.dto';
import { WordValidationProvider } from './providers/word-validation-provider';
import { EnrichedWordsProvider } from './providers/enriched-words';
import { Word } from '../../entities/word.entity';
import { toWordDto, type WordDto } from '../../common/dto/response-mappers';
import { SkipThrottle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { WordValidationThrottlerGuard } from './word-validation-throttler.guard';

@Controller('words')
export class WordsController {
  private readonly logger = new Logger(WordsController.name);

  constructor(
    private readonly wordsService: WordsService,
    private readonly wordScheduler: WordScheduler,
    private readonly wordValidationProvider: WordValidationProvider,
    private readonly enrichedWordsProvider: EnrichedWordsProvider,
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
    summary: "Get today's daily word",
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
    return toWordDto(await this.wordsService.getTodaysWord());
  }

  @Get('archive')
  @ApiOperation({
    summary: 'List archived daily puzzles for practice mode',
    description:
      'Returns past daily puzzle dates and their words in chronological order.',
  })
  async getDailyArchive(@Query('limit') limit = '100') {
    return this.wordsService.getDailyArchive(Number(limit));
  }

  @Post('daily/trigger')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
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

  @Post('daily/rotate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Force a new daily word (admin only)',
    description:
      'Immediately rotates the daily word for the configured timezone. The previous word is retired and a fresh unused word is selected. Rotation telemetry records only a word hash.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rotation executed successfully.',
    schema: {
      example: {
        status: 'Rotated',
        timezone: 'UTC',
        puzzleDate: '2026-01-01',
        wordHash: '9f86d081884c7d65',
        rotatedAt: '2026-01-01T00:00:03.120Z',
      },
    },
  })
  async rotateDailyWord() {
    return this.wordScheduler.rotateNow();
  }

  @Get('daily/health')
  @ApiOperation({
    summary: 'Check daily word job health status',
    description:
      'Returns status indicating whether the daily word job has run today.',
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

  @Post()
  @ApiOperation({ summary: 'Create a new word with difficulty' })
  @ApiResponse({ status: 201, type: WordResponseDto })
  async create(@Body() dto: CreateWordDto) {
    return toWordDto(await this.wordsService.createWord(dto));
  }

  @Post('validate')
  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard, WordValidationThrottlerGuard)
  async validateWord(@Body() { word }: ValidateWordDto) {
    // No validation logic here — service will handle errors
    return await this.wordValidationProvider.validateWord(word);
  }

  @Get(':text')
  @ApiOperation({
    summary: 'Get word details',
    description:
      'Fetches enriched details about a given word. If the word is not found, a 404 error is returned.',
  })
  @ApiParam({
    name: 'text',
    type: String,
    description: 'The word to look up',
    example: 'example',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the word details',
    type: Word,
  })
  @ApiNotFoundResponse({
    description: 'The requested word was not found',
  })
  async getWord(@Param('text') text: string): Promise<WordDto> {
    return toWordDto(await this.enrichedWordsProvider.getWord(text));
  }
}
