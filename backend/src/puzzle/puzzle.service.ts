import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePuzzleDto } from './dto/create-puzzle.dto';
import { UpdatePuzzleDto } from './dto/update-puzzle.dto';
import { Puzzle } from './entities/puzzle.entity';
import { PuzzleSession } from './entities/puzzle-session.entity';
import { DictionaryService } from '../dictionary/dictionary.service';
import { ValidateWordResponseDto } from './dto/validate-word.dto';

@Injectable()
export class PuzzleService {
  // private readonly puzzleRepository: Repository<Puzzle>

  constructor(
    @InjectRepository(Puzzle)
    private readonly puzzleRepository: Repository<Puzzle>,
    @InjectRepository(PuzzleSession)
    private puzzleSessionRepository: Repository<PuzzleSession>,
    private dictionaryService: DictionaryService,
  ) {}

  /**
   * Create a new puzzle with enhanced validation (for admin upload endpoint)
   * @param createPuzzleDto - Puzzle data
   * @returns Created puzzle
   */
  async createPuzzleWithEnhancedValidation(createPuzzleDto: CreatePuzzleDto): Promise<Puzzle> {
    // Check if puzzle already exists for this date
    const existingPuzzle = await this.puzzleRepository.findOne({
      where: { date: createPuzzleDto.date },
    })

    if (existingPuzzle) {
      throw new ConflictException(`Puzzle already exists for date ${createPuzzleDto.date}`)
    }

    // Enhanced validation beyond basic DTO validation
    this.validatePuzzleData(createPuzzleDto)

    // Normalize data
    const normalizedData = this.normalizePuzzleData(createPuzzleDto)

    // Create new puzzle instance
    const puzzle = this.puzzleRepository.create(normalizedData)

    // Validate grid dimensions
    if (!puzzle.validateGridDimensions()) {
      throw new BadRequestException("Grid must be 6x8 with single character strings")
    }

    // Validate spangram is in valid words
    if (!puzzle.validateSpangram()) {
      throw new BadRequestException("Spangram must be included in validWords array")
    }

    // Save and return
    return await this.puzzleRepository.save(puzzle)
  }

  /**
   * Create a new puzzle (existing method)
   * @param createPuzzleDto - Puzzle data
   * @returns Created puzzle
   */
  async createPuzzle(createPuzzleDto: CreatePuzzleDto): Promise<Puzzle> {
    // Check if puzzle already exists for this date
    const existingPuzzle = await this.puzzleRepository.findOne({
      where: { date: createPuzzleDto.date },
    })

    if (existingPuzzle) {
      throw new ConflictException(`Puzzle already exists for date ${createPuzzleDto.date}`)
    }

    // Create new puzzle instance
    const puzzle = this.puzzleRepository.create(createPuzzleDto)

    // Validate grid dimensions
    if (!puzzle.validateGridDimensions()) {
      throw new BadRequestException("Grid must be 6x8 with single character strings")
    }

    // Validate spangram is in valid words
    if (!puzzle.validateSpangram()) {
      throw new BadRequestException("Spangram must be included in validWords array")
    }

    // Save and return
    return await this.puzzleRepository.save(puzzle)
  }

  /**
   * Enhanced validation for puzzle data
   * @param createPuzzleDto - Puzzle data to validate
   */
  private validatePuzzleData(createPuzzleDto: CreatePuzzleDto): void {
    const { validWords, spangram, grid, theme } = createPuzzleDto

    // Validate theme is meaningful
    if (theme.trim().length < 3) {
      throw new BadRequestException("Theme must be at least 3 characters long")
    }

    // Ensure all words are unique (case-insensitive)
    const upperWords = validWords.map((word) => word.toUpperCase())
    const uniqueWords = new Set(upperWords)
    if (uniqueWords.size !== validWords.length) {
      throw new BadRequestException("All valid words must be unique")
    }

    // Ensure minimum word requirements
    if (validWords.length < 4) {
      throw new BadRequestException("Puzzle must have at least 4 valid words")
    }

    // Validate word lengths (reasonable range)
    const invalidWords = validWords.filter((word) => word.length < 3 || word.length > 15)
    if (invalidWords.length > 0) {
      throw new BadRequestException(`Words must be between 3-15 characters: ${invalidWords.join(", ")}`)
    }

    // Ensure spangram is one of the longer words
    const maxWordLength = Math.max(...validWords.map((word) => word.length))
    if (spangram.length < Math.max(4, maxWordLength - 2)) {
      throw new BadRequestException("Spangram should be one of the longest words (at least 4 letters)")
    }

    // Validate all words can be formed from grid letters
    this.validateWordsAgainstGrid(validWords, grid)
  }

  /**
   * Validate that all words can be formed from the grid
   * @param words - Words to validate
   * @param grid - Letter grid
   */
  private validateWordsAgainstGrid(words: string[], grid: string[][]): void {
    const gridLetters = grid.flat().map((letter) => letter.toUpperCase())
    const gridLetterCount = new Map<string, number>()

    gridLetters.forEach((letter) => {
      gridLetterCount.set(letter, (gridLetterCount.get(letter) || 0) + 1)
    })

    for (const word of words) {
      const upperWord = word.toUpperCase()
      const wordLetterCount = new Map<string, number>()

      upperWord.split("").forEach((letter) => {
        wordLetterCount.set(letter, (wordLetterCount.get(letter) || 0) + 1)
      })

      // Check if grid has enough of each letter for this word
      for (const [letter, count] of wordLetterCount) {
        if ((gridLetterCount.get(letter) || 0) < count) {
          throw new BadRequestException(
            `Word "${word}" cannot be formed from the grid - insufficient "${letter}" letters`,
          )
        }
      }
    }
  }

  /**
   * Normalize puzzle data
   * @param createPuzzleDto - Raw puzzle data
   * @returns Normalized puzzle data
   */
  private normalizePuzzleData(createPuzzleDto: CreatePuzzleDto): CreatePuzzleDto {
    return {
      ...createPuzzleDto,
      theme: createPuzzleDto.theme.trim(),
      grid: createPuzzleDto.grid.map((row) => row.map((cell) => cell.toUpperCase())),
      validWords: createPuzzleDto.validWords.map((word) => word.toUpperCase()),
      spangram: createPuzzleDto.spangram.toUpperCase(),
    }
  }

  /**
   * Get today's puzzle
   * @returns Today's puzzle or null if not found
   */
  async getTodaysPuzzle(): Promise<Puzzle | null> {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day

    return await this.puzzleRepository.findOne({
      where: { date: today },
    })
  }

  /**
   * Get puzzle by specific date
   * @param date - Target date
   * @returns Puzzle for the specified date
   */
  async getPuzzleByDate(date: Date): Promise<Puzzle> {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0) // Reset time to start of day

    const puzzle = await this.puzzleRepository.findOne({
      where: { date: targetDate },
    })

    if (!puzzle) {
      throw new NotFoundException(`No puzzle found for date ${targetDate.toISOString().split("T")[0]}`)
    }

    return puzzle
  }

  /**
   * Get puzzle by ID
   * @param id - Puzzle ID
   * @returns Puzzle with specified ID
   */
  async getPuzzleById(id: string): Promise<Puzzle> {
    const puzzle = await this.puzzleRepository.findOne({
      where: { id },
    })

    if (!puzzle) {
      throw new NotFoundException(`Puzzle with ID ${id} not found`)
    }

    return puzzle
  }

  /**
   * Update existing puzzle
   * @param id - Puzzle ID
   * @param updatePuzzleDto - Updated puzzle data
   * @returns Updated puzzle
   */
  async updatePuzzle(id: string, updatePuzzleDto: UpdatePuzzleDto): Promise<Puzzle> {
    const puzzle = await this.getPuzzleById(id)

    // Update fields if provided
    if (updatePuzzleDto.theme) {
      puzzle.theme = updatePuzzleDto.theme
    }

    if (updatePuzzleDto.grid) {
      puzzle.grid = updatePuzzleDto.grid
      // Validate new grid dimensions
      if (!puzzle.validateGridDimensions()) {
        throw new BadRequestException("Grid must be 6x8 with single character strings")
      }
    }

    if (updatePuzzleDto.validWords) {
      puzzle.validWords = updatePuzzleDto.validWords
    }

    if (updatePuzzleDto.spangram) {
      puzzle.spangram = updatePuzzleDto.spangram
    }

    // Validate spangram is still in valid words after update
    if (!puzzle.validateSpangram()) {
      throw new BadRequestException("Spangram must be included in validWords array")
    }

    return await this.puzzleRepository.save(puzzle)
  }

  /**
   * Delete puzzle by ID (admin only)
   * @param id - Puzzle ID
   * @returns Deletion result
   */
  async deletePuzzle(id: string): Promise<{ deleted: boolean; message: string }> {
    const puzzle = await this.getPuzzleById(id)

    await this.puzzleRepository.remove(puzzle)

    return {
      deleted: true,
      message: `Puzzle for ${puzzle.date.toISOString().split("T")[0]} has been deleted`,
    }
  }

  /**
   * Get all puzzles (admin functionality)
   * @param limit - Number of puzzles to return
   * @param offset - Number of puzzles to skip
   * @returns Array of puzzles
   */
  async getAllPuzzles(limit = 10, offset = 0): Promise<{ puzzles: Puzzle[]; total: number }> {
    const [puzzles, total] = await this.puzzleRepository.findAndCount({
      order: { date: "DESC" },
      take: limit,
      skip: offset,
    })

    return { puzzles, total }
  }

  /**
   * Validate puzzle solution
   * @param puzzleId - Puzzle ID
   * @param foundWords - Words found by player
   * @returns Validation result
   */
  async validateSolution(
    puzzleId: string,
    foundWords: string[],
  ): Promise<{
    isComplete: boolean
    validWords: string[]
    invalidWords: string[]
    missingWords: string[]
    foundSpangram: boolean
  }> {
    const puzzle = await this.getPuzzleById(puzzleId)

    const validFoundWords = foundWords.filter((word) => puzzle.validWords.includes(word.toUpperCase()))

    const invalidWords = foundWords.filter((word) => !puzzle.validWords.includes(word.toUpperCase()))

    const missingWords = puzzle.validWords.filter((word) => !foundWords.map((w) => w.toUpperCase()).includes(word))

    const foundSpangram = foundWords.map((w) => w.toUpperCase()).includes(puzzle.spangram.toUpperCase())

    const isComplete = missingWords.length === 0 && foundSpangram

    return {
      isComplete,
      validWords: validFoundWords,
      invalidWords,
      missingWords,
      foundSpangram,
    }
  }

  async validateWord(word: string, userId: string): Promise<ValidateWordResponseDto> {
    // Normalize the word
    const normalizedWord = word.toLowerCase().trim();

    // Get today's puzzle
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const puzzle = await this.puzzleRepository.findOne({
      where: { date: today },
    });

    if (!puzzle) {
      throw new NotFoundException('No puzzle found for today');
    }

    // Get user's session
    let session = await this.puzzleSessionRepository.findOne({
      where: { userId, puzzleId: puzzle.id },
    });

    if (!session) {
      throw new NotFoundException('No active session found');
    }

    // Check if word was already submitted
    if (
      session.foundWords.includes(normalizedWord) ||
      session.nonThemeWords.includes(normalizedWord)
    ) {
      return {
        word: normalizedWord,
        type: 'invalid',
        valid: false,
        earnedHints: session.earnedHints,
        updatedSession: session,
      };
    }

    let type: string;
    let valid = false;
    let earnedHints = session.earnedHints;

    // Check word type
    if (normalizedWord === puzzle.spangram.toLowerCase()) {
      type = 'spangram';
      valid = true;
      session.foundWords.push(normalizedWord);
    } else if (puzzle.validWords.map(w => w.toLowerCase()).includes(normalizedWord)) {
      type = 'theme';
      valid = true;
      session.foundWords.push(normalizedWord);
    } else if (
      (await this.dictionaryService.getValidWords(
        puzzle.grid.flat().map(l => l.toLowerCase()),
        puzzle.grid[2][3].toLowerCase() // Example: assuming center letter is at grid[2][3]
      )).includes(normalizedWord)
    ) {
      type = 'non-theme';
      valid = true;
      session.nonThemeWords.push(normalizedWord);
      // Example: earn 1 hint for every 3 non-theme words
      if (session.nonThemeWords.length % 3 === 0) {
        earnedHints += 1;
        session.earnedHints = earnedHints;
      }
    } else {
      type = 'invalid';
      valid = false;
    }

    // Update session
    session.updatedAt = new Date();
    session = await this.puzzleSessionRepository.save(session);

    return {
      word: normalizedWord,
      type,
      valid,
      earnedHints,
      updatedSession: session,
    };
  }
}
