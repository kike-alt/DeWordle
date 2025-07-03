import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../../../../security/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { AddWordDto } from './dto/add-word.dto';
import { UseHintDto } from './dto/use-hint.dto';

@ApiTags('Strands Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/strands/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new game session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or session already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or puzzle not found',
  })
  async create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionService.create(createSessionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions with optional filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sessions retrieved successfully',
  })
  async findAll(
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Query('puzzleId', new ParseIntPipe({ optional: true })) puzzleId?: number,
  ) {
    return await this.sessionService.findAll(userId, puzzleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sessionService.findOne(id);
  }

  @Get('user/:userId/puzzle/:puzzleId')
  @ApiOperation({ summary: 'Get session by user and puzzle' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async findByUserAndPuzzle(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('puzzleId', ParseIntPipe) puzzleId: number,
  ) {
    return await this.sessionService.findByUserAndPuzzle(userId, puzzleId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    return await this.sessionService.update(id, updateSessionDto);
  }

  @Post(':id/words')
  @ApiOperation({ summary: 'Add a word to the session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Word added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid word or session completed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async addWord(
    @Param('id', ParseIntPipe) id: number,
    @Body() addWordDto: AddWordDto,
  ) {
    return await this.sessionService.addWord(id, addWordDto);
  }

  @Post(':id/hints/use')
  @ApiOperation({ summary: 'Use a hint in the session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hint used successfully' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No hints available or session completed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async useHint(
    @Param('id', ParseIntPipe) id: number,
    @Body() useHintDto: UseHintDto,
  ) {
    return await this.sessionService.useHint(id, useHintDto);
  }

  @Delete(':id/hints')
  @ApiOperation({ summary: 'Clear active hint' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hint cleared successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async clearHint(@Param('id', ParseIntPipe) id: number) {
    return await this.sessionService.clearHint(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark session as completed' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Session already completed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async completeSession(
    @Param('id', ParseIntPipe) id: number,
    earnedHints: number,
    spangramFound: boolean,
  ) {
    return await this.sessionService.completeSession(
      id,
      earnedHints,
      spangramFound,
    );
  }

  @Get('users/:userId/stats')
  @ApiOperation({ summary: 'Get user statistics for Strands game' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getUserStats(@Param('userId', ParseIntPipe) userId: number) {
    return await this.sessionService.getUserStats(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.sessionService.remove(id);
    return { message: 'Session deleted successfully' };
  }
}
