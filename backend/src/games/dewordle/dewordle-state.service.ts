import { Injectable } from '@nestjs/common';
import { GamesService } from '../games.service';
import { CreateGameDto, UpdateGameStateDto } from '../dtos/game.dto';
import { Game } from '../entities/game.entity';
export interface GuessResult {
  word: string;
  result: ('correct' | 'present' | 'absent')[];
}

export interface DewordleAdditionalState {
  maxAttempts: number;
  wordLength: number;
  guessResults: GuessResult[];
  difficulty: 'easy' | 'medium' | 'hard';
  hints: {
    hintsRevealed: number;
    maxHints: number;
    revealedPositions: number[];
  };
}

@Injectable()
export class DewordleStateService {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * Create a new Dewordle game
   */
  async createDewordleGame(
    userId: string,
    word: string,
    category: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  ): Promise<Game> {
    // Validate word length
    if (word.length !== 5) {
      throw new Error('Word must be exactly 5 letters long');
    }
    
    // Set up additional state specific to Dewordle
    const maxAttempts = this.getMaxAttemptsByDifficulty(difficulty);
    const maxHints = this.getMaxHintsByDifficulty(difficulty);
    
    const additionalState: DewordleAdditionalState = {
      maxAttempts,
      wordLength: word.length,
      guessResults: [],
      difficulty,
      hints: {
        hintsRevealed: 0,
        maxHints,
        revealedPositions: [],
      },
    };

    const createGameDto: CreateGameDto = {
      userId,
      gameType: 'dewordle',
      word: word.toLowerCase(),
      category,
      additionalState,
    };

    return this.gamesService.createGame(createGameDto);
  }

  /**
   * Make a guess in a Dewordle game
   */
  async makeGuess(gameId: string, guessWord: string): Promise<Game> {
    // Get the current game state
    const game = await this.gamesService.getGameById(gameId);
    
    if (game.status !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }
    
    const additionalState = game.additionalState as DewordleAdditionalState;
    
    // Validate guess word length
    if (guessWord.length !== additionalState.wordLength) {
      throw new Error(`Guess must be exactly ${additionalState.wordLength} letters long`);
    }
    
    // Convert to lowercase for consistency
    guessWord = guessWord.toLowerCase();
    const targetWord = game.word.toLowerCase();
    
    // Check if max attempts reached
    if (additionalState.guessResults.length >= additionalState.maxAttempts) {
      throw new Error('Maximum number of attempts reached');
    }
    
    // Calculate result for this guess
    const result = this.calculateGuessResult(targetWord, guessWord);
    
    // Update game state with new guess
    const newGuessResults = [
      ...additionalState.guessResults,
      { word: guessWord, result },
    ];
    
    const newAdditionalState: DewordleAdditionalState = {
      ...additionalState,
      guessResults: newGuessResults,
    };
    
    const updateDto: UpdateGameStateDto = {
      additionalState: newAdditionalState,
    };
    
    // Check if the guess is correct (all letters are 'correct')
    const isCorrect = result.every(r => r === 'correct');
    
    if (isCorrect) {
      // Game won
      updateDto.status = 'WON';
      updateDto.score = this.calculateScore(game, newGuessResults.length);
    } else if (newGuessResults.length >= additionalState.maxAttempts) {
      // Game lost - no more attempts
      updateDto.status = 'LOST';
    }
    
    // Update the game state
    return this.gamesService.updateGameState(gameId, updateDto);
  }

  /**
   * Use a hint in a Dewordle game
   */
  async useHint(gameId: string): Promise<Game> {
    // Get the current game state
    const game = await this.gamesService.getGameById(gameId);
    
    if (game.status !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }
    
    const additionalState = game.additionalState as DewordleAdditionalState;
    
    // Check if hints are available
    if (additionalState.hints.hintsRevealed >= additionalState.hints.maxHints) {
      throw new Error('No hints remaining');
    }
    
    // Find a letter position that hasn't been revealed yet
    const word = game.word.toLowerCase();
    const revealedPositions = additionalState.hints.revealedPositions;
    const unrevealedPositions = [];
    
    for (let i = 0; i < word.length; i++) {
      if (!revealedPositions.includes(i)) {
        unrevealedPositions.push(i);
      }
    }
    
    if (unrevealedPositions.length === 0) {
      throw new Error('No unrevealed letters available for hint');
    }
    
    // Randomly select an unrevealed position
    const randomIndex = Math.floor(Math.random() * unrevealedPositions.length);
    const positionToReveal = unrevealedPositions[randomIndex];
    
    // Update the game state
    const newRevealedPositions = [...revealedPositions, positionToReveal];
    
    const newAdditionalState: DewordleAdditionalState = {
      ...additionalState,
      hints: {
        ...additionalState.hints,
        hintsRevealed: additionalState.hints.hintsRevealed + 1,
        revealedPositions: newRevealedPositions,
      },
    };
    
    const updateDto: UpdateGameStateDto = {
      additionalState: newAdditionalState,
    };
    
    return this.gamesService.updateGameState(gameId, updateDto);
  }

  /**
   * Calculate the result of a guess compared to the target word
   */
  private calculateGuessResult(
    targetWord: string, 
    guessWord: string
  ): ('correct' | 'present' | 'absent')[] {
    const result: ('correct' | 'present' | 'absent')[] = Array(targetWord.length).fill('absent');
    const targetChars = targetWord.split('');
    const guessChars = guessWord.split('');
    
    // First pass: mark correct positions
    for (let i = 0; i < targetChars.length; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = 'correct';
        targetChars[i] = '*'; // Mark as used
        guessChars[i] = '*'; // Mark as used
      }
    }
    
    // Second pass: mark present letters
    for (let i = 0; i < guessChars.length; i++) {
      if (guessChars[i] !== '*') { // Skip already marked correct
        const targetIndex = targetChars.findIndex(c => c === guessChars[i]);
        if (targetIndex !== -1) {
          result[i] = 'present';
          targetChars[targetIndex] = '*'; // Mark as used
        }
      }
    }
    
    return result;
  }

  /**
   * Get max attempts based on difficulty
   */
  private getMaxAttemptsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy':
        return 8;
      case 'medium':
        return 6;
      case 'hard':
        return 4;
      default:
        return 6;
    }
  }

  /**
   * Get max hints based on difficulty
   */
  private getMaxHintsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy':
        return 2;
      case 'medium':
        return 1;
      case 'hard':
        return 0;
      default:
        return 1;
    }
  }

  /**
   * Calculate score based on game performance
   */
  private calculateScore(game: Game, attempts: number): number {
    const additionalState = game.additionalState as DewordleAdditionalState;
    const maxAttempts = additionalState.maxAttempts;
    const hintsUsed = additionalState.hints.hintsRevealed;
    
    // Base score
    let score = 100;
    
    // Deduct points based on attempts used
    const attemptPenalty = Math.round((attempts / maxAttempts) * 50);
    score -= attemptPenalty;
    
    // Deduct points for hints used
    score -= hintsUsed * 15;
    
    // Bonus for difficulty
    switch (additionalState.difficulty) {
      case 'easy':
        score *= 1;
        break;
      case 'medium':
        score *= 1.5;
        break;
      case 'hard':
        score *= 2;
        break;
    }
    
    return Math.max(Math.round(score), 0);
  }
}