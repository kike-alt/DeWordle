import { 
  Controller, 
  Post, 
  Body, 
  Param, 
  Get,
  Patch,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody 
} from '@nestjs/swagger';
import { HangmanStateService } from './hangman-state.service';
import { Game } from '../entities/game.entity';

class CreateHangmanGameDto {
  userId: string;
  word: string;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

class GuessLetterDto {
  letter: string;
}

class UseHintDto {
  // Empty dto for consistency in API
}

@ApiTags('hangman')
@Controller('games/hangman')
export class HangmanController {
  constructor(private readonly hangmanStateService: HangmanStateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Hangman game' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Hangman game created successfully' 
  })
  @ApiBody({ type: CreateHangmanGameDto })
  async createGame(@Body() createGameDto: CreateHangmanGameDto): Promise<Game> {
    try {
      return await this.hangmanStateService.createHangmanGame(
        createGameDto.userId,
        createGameDto.word,
        createGameDto.category,
        createGameDto.difficulty,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id/guess')
  @ApiOperation({ summary: 'Make a guess in a Hangman game' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Guess processed successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid guess or game state' 
  })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiBody({ type: GuessLetterDto })
  async makeGuess(
    @Param('id') id: string,
    @Body() guessDto: GuessLetterDto,
  ): Promise<Game> {
    try {
      return await this.hangmanStateService.makeGuess(id, guessDto.letter);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id/hint')
  @ApiOperation({ summary: 'Use a hint in a Hangman game' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Hint used successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'No hints available or invalid game state' 
  })
  @ApiParam({ name: 'id', description: 'Game ID' })
  async useHint(@Param('id') id: string): Promise<Game> {
    try {
      return await this.hangmanStateService.useHint(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}