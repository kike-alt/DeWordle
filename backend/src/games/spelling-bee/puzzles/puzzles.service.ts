import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UserGame } from '../user-games/entities/user-game.entity';
import { CreatePuzzleDto } from './dto/create-puzzle.dto';
import { SubmitWordDto } from './dto/submit-word.dto';
import { UpdatePuzzleDto } from './dto/update-puzzle.dto';
import { Puzzle } from './entities/puzzle.entity';
import { WordValidatorService } from './providers/word-validator-service.service';

@Injectable()
export class PuzzlesService {
  constructor(
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
    @InjectRepository(UserGame)
    private userGameRepository: Repository<UserGame>,
    private wordValidatorService: WordValidatorService,
  ) {}

  create(createPuzzleDto: CreatePuzzleDto) {
    const puzzle = this.puzzleRepository.create({
      ...createPuzzleDto,
    });

    return this.puzzleRepository.save(puzzle);
  }

  findAll() {
    return this.puzzleRepository.find({ order: { date: 'DESC' } });
  }

  findOne(id: number) {
    return this.puzzleRepository.findOneBy({ id });
  }

  findCurrent() {
    return this.puzzleRepository.findOne({
      order: { date: 'DESC' },
      where: { id: MoreThan(0) },
    });
  }

  update(id: number, updatePuzzleDto: UpdatePuzzleDto) {
    return `This action updates a #${id} puzzle`;
  }

  remove(id: number) {
    return `This action removes a #${id} puzzle`;
  }

  async submitWord(id: number, submitWordDto: SubmitWordDto) {
    const puzzle = await this.findOne(id);

    return this.wordValidatorService.validateWord(submitWordDto.word, puzzle);
  }

  async shuffleUserGrid(userId: number): Promise<string[][]> {
    // Get current puzzle
    const puzzle = await this.findCurrent();
    if (!puzzle) {
      throw new NotFoundException('Current puzzle not found');
    }

    // Get user session
    const session = await this.userGameRepository.findOne({
      where: {
        user: { id: userId },
        puzzle: { id: puzzle.id },
      },
    });

    if (!session) {
      throw new NotFoundException('User session not found');
    }

    // Create grid from puzzle data
    const grid = this.createGridFromPuzzle(puzzle);

    // Shuffle the grid
    return this.shuffleGrid(grid);
  }

  private shuffleGrid(grid: string[][]): string[][] {
    if (!grid || grid.length === 0) return grid;

    const rows = grid.length;
    const cols = grid[0].length;
    const flattened = grid.flat();

    // Fisher-Yates shuffle algorithm
    for (let i = flattened.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flattened[i], flattened[j]] = [flattened[j], flattened[i]];
    }

    // Reshape back to original dimensions
    const shuffledGrid: string[][] = [];
    for (let i = 0; i < rows; i++) {
      shuffledGrid.push(flattened.slice(i * cols, (i + 1) * cols));
    }

    return shuffledGrid;
  }

  // New function to create grid from puzzle data
  private createGridFromPuzzle(puzzle: Puzzle): string[][] {
    // Combine center letter with other letters
    const allLetters = puzzle.centerLetter + puzzle.letters;
    const lettersArray = allLetters.split('');

    // Create a 2x4 grid (modify dimensions as needed)
    const grid: string[][] = [];
    for (let i = 0; i < 2; i++) {
      grid.push(lettersArray.slice(i * 4, (i + 1) * 4));
    }

    return grid;
  }
}
