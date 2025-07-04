import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Game } from './entities/game.entity';
import { CreateGameDto, LoadGameDto, UpdateGameStateDto } from './dtos/game.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  /**
   * Create a new game
   */
  async createGame(createGameDto: CreateGameDto): Promise<Game> {
    const gameId = uuidv4();
    
    const game = this.gameRepository.create({
      id: gameId,
      ...createGameDto,
    });
    
    return this.gameRepository.save(game);
  }

  /**
   * Get a game by ID
   */
  async getGameById(id: string): Promise<Game> {
    const game = await this.gameRepository.findOne({ where: { id } });
    
    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }
    
    return game;
  }

  /**
   * Update game state
   */
  async updateGameState(id: string, updateGameStateDto: UpdateGameStateDto): Promise<Game> {
    const game = await this.getGameById(id);
    
    // Validate state update
    this.validateGameStateUpdate(game, updateGameStateDto);
    
    // Merge and save the updated state
    Object.assign(game, updateGameStateDto);
    
    return this.gameRepository.save(game);
  }

  /**
   * Resume a game by ID
   */
  async resumeGame(id: string): Promise<Game> {
    const game = await this.getGameById(id);
    
    if (game.status !== 'PAUSED') {
      throw new BadRequestException('Only paused games can be resumed');
    }
    
    game.status = 'IN_PROGRESS';
    return this.gameRepository.save(game);
  }

  /**
   * Pause a game
   */
  async pauseGame(id: string): Promise<Game> {
    const game = await this.getGameById(id);
    
    if (game.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Only in-progress games can be paused');
    }
    
    game.status = 'PAUSED';
    return this.gameRepository.save(game);
  }

  /**
   * Get games for a user
   */
  async getUserGames(loadGameDto: LoadGameDto): Promise<Game[]> {
    const { userId, gameType, status } = loadGameDto;
    
    const queryBuilder = this.gameRepository.createQueryBuilder('game')
      .where('game.userId = :userId', { userId });
    
    if (gameType) {
      queryBuilder.andWhere('game.gameType = :gameType', { gameType });
    }
    
    if (status) {
      queryBuilder.andWhere('game.status = :status', { status });
    }
    
    // Order by most recently updated
    queryBuilder.orderBy('game.updatedAt', 'DESC');
    
    return queryBuilder.getMany();
  }

  /**
   * Delete a game by ID
   */
  async deleteGame(id: string): Promise<void> {
    const result = await this.gameRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }
  }

  /**
   * Validate game state updates
   * This prevents invalid state transitions and ensures data integrity
   */
  private validateGameStateUpdate(game: Game, updateDto: UpdateGameStateDto): void {
    // Prevent modifying completed games
    if (game.status === 'WON' || game.status === 'LOST') {
      if (updateDto.status && updateDto.status !== game.status) {
        throw new BadRequestException('Cannot modify the status of a completed game');
      }
    }
    
    // Validate game-specific state - Can be extended for different game types
    switch (game.gameType) {
      case 'hangman':
        this.validateHangmanStateUpdate(game, updateDto);
        break;
      case 'dewordle':
        this.validateDewordleStateUpdate(game, updateDto);
        break;
      case 'spelling-bee':
        this.validateSpellingBeeStateUpdate(game, updateDto);
        break;
    }
  }

  /**
   * Validate Hangman-specific state updates
   */
  private validateHangmanStateUpdate(game: Game, updateDto: UpdateGameStateDto): void {
    // Ensure wrongGuesses doesn't decrease
    if (updateDto.wrongGuesses !== undefined && 
        game.wrongGuesses !== null && 
        updateDto.wrongGuesses < game.wrongGuesses) {
      throw new BadRequestException('Wrong guesses count cannot decrease');
    }
    
    // Ensure no duplicate letters in guessedLetters
    if (updateDto.guessedLetters) {
      const uniqueLetters = [...new Set(updateDto.guessedLetters)];
      if (uniqueLetters.length !== updateDto.guessedLetters.length) {
        throw new BadRequestException('Guessed letters cannot contain duplicates');
      }
    }
  }

  /**
   * Validate Dewordle-specific state updates
   */
  private validateDewordleStateUpdate(game: Game, updateDto: UpdateGameStateDto): void {
    // Add Dewordle-specific validations
    // This is a placeholder - implement actual validation logic
  }

  /**
   * Validate Spelling Bee-specific state updates
   */
  private validateSpellingBeeStateUpdate(game: Game, updateDto: UpdateGameStateDto): void {
    // Add Spelling Bee-specific validations
    // This is a placeholder - implement actual validation logic
  }
}