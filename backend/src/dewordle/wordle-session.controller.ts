import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WordleSessionService } from './wordle-session.service';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { WordleSession } from './entities/wordle-session.entity';

@ApiTags('Wordle Sessions')
@Controller('wordle-sessions')
export class WordleSessionController {
  constructor(private readonly wordleSessionService: WordleSessionService) {}

  @Post(':id/guess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a guess for a wordle session',
    description:
      'Submit a 5-letter word guess for the specified wordle session. The guess will be evaluated against the target word and the session will be updated with the result.',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the wordle session',
    type: 'number',
    example: 123,
  })
  @ApiBody({
    type: SubmitGuessDto,
    description: 'The guess to submit',
    examples: {
      example1: {
        summary: 'Submit guess',
        value: {
          guess: 'AUDIO',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Guess submitted successfully',
    schema: {
      example: {
        id: 123,
        guessHistory: [
          {
            guess: 'AUDIO',
            result: [
              { letter: 'A', status: 'absent' },
              { letter: 'U', status: 'present' },
              { letter: 'D', status: 'absent' },
              { letter: 'I', status: 'correct' },
              { letter: 'O', status: 'absent' },
            ],
            timestamp: '2024-01-15T10:30:00.000Z',
          },
        ],
        isCompleted: false,
        isWon: false,
        attemptsRemaining: 5,
        targetWord: {
          id: 'uuid-string',
          word: 'SUITE',
        },
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Wordle session not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Wordle session not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid guess or session already completed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Game session is already completed',
        error: 'Bad Request',
      },
    },
  })
  async submitGuess(
    @Param('id') sessionId: string,
    @Body() submitGuessDto: SubmitGuessDto,
  ): Promise<WordleSession> {
    const id = parseInt(sessionId, 10);

    if (isNaN(id)) {
      throw new NotFoundException('Invalid session ID');
    }

    return await this.wordleSessionService.submitGuess(id, submitGuessDto);
  }
}
