import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from 'src/admin/guards/admin-jwt-auth.guard';
import { CreatePuzzleDto } from './dto/create-puzzle.dto';
import { SubmitWordDto } from './dto/submit-word.dto';
import { UpdatePuzzleDto } from './dto/update-puzzle.dto';
import { PuzzlesService } from './puzzles.service';

@Controller('spelling-bee/puzzles')
export class PuzzlesController {
  constructor(private readonly puzzleService: PuzzlesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new puzzle' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Spelling Bee game created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Data does not follow DTO',
  })
  @ApiBody({ type: CreatePuzzleDto })
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() createPuzzleDto: CreatePuzzleDto) {
    try {
      return this.puzzleService.create(createPuzzleDto);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Invalid verification token',
      );
    }
  }

  @Get()
  findAll() {
    return this.puzzleService.findAll();
  }

  @Get('current')
  async findCurrent() {
    const puzzle = await this.puzzleService.findCurrent();

    if (!puzzle) {
      // throw new NotFoundException('Not current puzzle found!');
      return [];
    }

    return puzzle;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a puzzle by its id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Spelling Bee puzzle retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Spelling Bee puzzle was not found',
  })
  async findOne(@Param('id') id: string) {
    const idNumber = parseInt(id, 10);

    if (isNaN(idNumber)) {
      throw new NotFoundException('Puzzle not found!');
    }

    const puzzle = await this.puzzleService.findOne(idNumber);

    if (!puzzle) {
      throw new NotFoundException('Puzzle not found!');
    }

    return puzzle;
  }

  @Post(':id/submit-word')
  @HttpCode(200)
  submitWord(@Param('id') id: string, @Body() submitWordDto: SubmitWordDto) {
    return this.puzzleService.submitWord(+id, submitWordDto);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@Param('id') id: string, @Body() updatePuzzleDto: UpdatePuzzleDto) {
    return this.puzzleService.update(+id, updatePuzzleDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.puzzleService.remove(+id);
  }

  @Post('shuffle')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Shuffle the current puzzle grid' })
  @ApiResponse({
    status: 200,
    description: 'Returns shuffled grid',
    schema: {
      example: {
        shuffledGrid: [
          ['E', 'T', 'A', 'P'],
          ['R', 'S', 'C', 'H'],
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async shuffle(@Req() req) {
    const userId = req.user.id;
    const shuffledGrid = await this.puzzleService.shuffleUserGrid(userId);
    return { shuffledGrid };
  }
}
