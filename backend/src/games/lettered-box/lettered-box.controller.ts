import { 
  Controller, 
  Post, 
  Body, 
  Param, 
  Patch,
  Get,
  HttpStatus,
  HttpException,
  UseGuards,
  Request
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { LetteredBoxService } from './lettered-box.service';
import { Game } from '../entities/game.entity';
import { LetteredBoxBoardLayout, LetteredBoxStateService } from './lettered-box-state.service';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';

class CreateLetteredBoxGameDto {
  board?: LetteredBoxBoardLayout;
  difficulty?: 'easy' | 'medium' | 'hard';
}

class SubmitSolutionDto {
  words: string[];
}

class AddWordDto {
  word: string;
}

@ApiTags('lettered-box')
@Controller('games/lettered-box')
export class LetteredBoxController {
  constructor(
    private readonly letteredBoxStateService: LetteredBoxStateService,
    private readonly letteredBoxService: LetteredBoxService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new Lettered Box game' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Lettered Box game created successfully' 
  })
  @ApiBody({ type: CreateLetteredBoxGameDto })
  async createGame(
    @Body() createGameDto: CreateLetteredBoxGameDto,
    @Request() req
  ): Promise<Game> {
    try {
      const userId = req.user.id;
      return await this.letteredBoxStateService.createLetteredBoxGame(
        userId,
        createGameDto.board,
        createGameDto.difficulty,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a solution for a Lettered Box game' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Solution submitted successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid solution or game state' 
  })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiBody({ type: SubmitSolutionDto })
  async submitSolution(
    @Param('id') id: string,
    @Body() solutionDto: SubmitSolutionDto,
  ): Promise<Game> {
    try {
      return await this.letteredBoxStateService.submitSolution(id, solutionDto.words);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id/add-word')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a word to the current chain' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Word added successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid word or game state' 
  })
  @ApiParam({ name: 'id', description: 'Game ID' })
  @ApiBody({ type: AddWordDto })
  async addWord(
    @Param('id') id: string,
    @Body() addWordDto: AddWordDto,
  ): Promise<Game> {
    try {
      return await this.letteredBoxStateService.addWordToChain(id, addWordDto.word);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id/hint')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Use a hint in a Lettered Box game' })
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
      return await this.letteredBoxStateService.useHint(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a summary of the current game state' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Game summary retrieved successfully' 
  })
  @ApiParam({ name: 'id', description: 'Game ID' })
  async getGameSummary(@Param('id') id: string) {
    try {
      return await this.letteredBoxService.generateGameSummary(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get the Lettered Box game leaderboard' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Leaderboard retrieved successfully' 
  })
  async getLeaderboard() {
    try {
      return await this.letteredBoxService.getLeaderboard();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}