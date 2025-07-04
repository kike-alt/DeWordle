import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EnrichedWord } from '../../utils/dictionary.helper';

@Controller('words')
export class WordsController {
  private readonly logger = new Logger(WordsController.name);

  constructor(private readonly wordsService: WordsService) {}

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
}
