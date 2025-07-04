import { 
    Controller, 
    Post, 
    Body, 
    Param, 
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
  import { DewordleStateService } from './dewordle-state.service';
  import { Game } from '../entities/game.entity';
  
  class CreateDewordleGameDto {
    userId: string;
    word: string;
    category: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }
  
  class GuessWordDto {
    word: string;
  }
  
  @ApiTags('dewordle')
  @Controller('games/dewordle')
  export class DewordleController {
    constructor(private readonly dewordleStateService: DewordleStateService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new Dewordle game' })
    @ApiResponse({ 
      status: HttpStatus.CREATED, 
      description: 'Dewordle game created successfully' 
    })
    @ApiBody({ type: CreateDewordleGameDto })
    async createGame(@Body() createGameDto: CreateDewordleGameDto): Promise<Game> {
      try {
        return await this.dewordleStateService.createDewordleGame(
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
    @ApiOperation({ summary: 'Make a guess in a Dewordle game' })
    @ApiResponse({ 
      status: HttpStatus.OK, 
      description: 'Guess processed successfully' 
    })
    @ApiResponse({ 
      status: HttpStatus.BAD_REQUEST, 
      description: 'Invalid guess or game state' 
    })
    @ApiParam({ name: 'id', description: 'Game ID' })
    @ApiBody({ type: GuessWordDto })
    async makeGuess(
      @Param('id') id: string,
      @Body() guessDto: GuessWordDto,
    ): Promise<Game> {
      try {
        return await this.dewordleStateService.makeGuess(id, guessDto.word);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    @Patch(':id/hint')
    @ApiOperation({ summary: 'Use a hint in a Dewordle game' })
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
        return await this.dewordleStateService.useHint(id);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }