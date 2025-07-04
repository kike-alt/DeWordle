import { Injectable } from '@nestjs/common';
import { GamesService } from '../games.service';
import { Game } from '../entities/game.entity';
import { CreateGameDto, UpdateGameStateDto } from '../dtos/game.dto';

export interface HangmanAdditionalState {
  difficulty: 'easy' | 'medium' | 'hard';
  maxWrongGuesses: number;
  hints: {
    hintsRevealed: number;
    maxHints: number;
    revealedPositions: number[];
  };
}

@Injectable()
export class HangmanStateService {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * Create a new Hangman game
   */
  async createHangmanGame(
    userId: string,
    word: string,
    category: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  ): Promise<Game> {
    // Set up additional state specific to Hangman
    const maxWrongGuesses = this.getMaxWrongGuessesByDifficulty(difficulty);
    const maxHints = this.getMaxHintsByDifficulty(difficulty);
    
    const additionalState: HangmanAdditionalState = {
      difficulty,
      maxWrongGuesses,
      hints: {
        hintsRevealed: 0,
        maxHints,
        revealedPositions: [],
      },
    };

    const createGameDto: CreateGameDto = {
      userId,
      gameType: 'hangman',
      word,
      category,
      additionalState,
    };

    return this.gamesService.createGame(createGameDto);
  }

  /**
   * Make a guess in a Hangman game
   */
  async makeGuess(gameId: string, letter: string): Promise<Game> {
    // Get the current game state
    const game = await this.gamesService.getGameById(gameId);
    
    if (game.status !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }
    
    // Validate the guess
    if (!letter || letter.length !== 1) {
      throw new Error('Guess must be a single letter');
    }
    
    letter = letter.toLowerCase();
    
    // Check if the letter has already been guessed
    const guessedLetters = game.guessedLetters || [];
    if (guessedLetters.includes(letter)) {
      throw new Error('Letter has already been guessed');
    }
    
    // Update guessed letters
    const updateDto: UpdateGameStateDto = {
      guessedLetters: [...guessedLetters, letter],
    };
    
    // Check if the guess is correct
    const word = game.word.toLowerCase();
    if (!word.includes(letter)) {
      // Incorrect guess
      updateDto.wrongGuesses = (game.wrongGuesses || 0) + 1;
      
      // Check if the game is lost
      const additionalState = game.additionalState as HangmanAdditionalState;
      if (updateDto.wrongGuesses >= additionalState.maxWrongGuesses) {
        updateDto.status = 'LOST';
      }
    } else {
      // Correct guess - Check if the game is won
      const lettersToGuess = new Set(word.split(''));
      const correctGuesses = new Set([
        ...guessedLetters.filter(l => word.includes(l)),
        letter,
      ]);
      
      // Check if all letters in the word have been guessed
      const allLettersGuessed = [...lettersToGuess].every(l => correctGuesses.has(l));
      
      if (allLettersGuessed) {
        updateDto.status = 'WON';
        updateDto.score = this.calculateScore(game);
      }
    }
    
    // Update the game state
    return this.gamesService.updateGameState(gameId, updateDto);
  }

  /**
   * Use a hint in a Hangman game
   */
  async useHint(gameId: string): Promise<Game> {
    // Get the current game state
    const game = await this.gamesService.getGameById(gameId);
    
    if (game.status !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }
    
    const additionalState = game.additionalState as HangmanAdditionalState;
    
    // Check if hints are available
    if (additionalState.hints.hintsRevealed >= additionalState.hints.maxHints) {
      throw new Error('No hints remaining');
    }
    
    // Find a letter position that hasn't been revealed yet
    const word = game.word.toLowerCase();
    const guessedLetters = game.guessedLetters || [];
    const unrevealedPositions = [];
    
    for (let i = 0; i < word.length; i++) {
      if (!guessedLetters.includes(word[i]) && 
          !additionalState.hints.revealedPositions.includes(i)) {
        unrevealedPositions.push(i);
      }
    }
    
    if (unrevealedPositions.length === 0) {
      throw new Error('No unrevealed letters available for hint');
    }
    
    // Randomly select an unrevealed position
    const randomIndex = Math.floor(Math.random() * unrevealedPositions.length);
    const positionToReveal = unrevealedPositions[randomIndex];
    const letterToReveal = word[positionToReveal];
    
    // Update the game state
    const newRevealedPositions = [
      ...additionalState.hints.revealedPositions,
      positionToReveal,
    ];
    
    const newGuessedLetters = guessedLetters.includes(letterToReveal)
      ? guessedLetters
      : [...guessedLetters, letterToReveal];
    
    const newAdditionalState: HangmanAdditionalState = {
      ...additionalState,
      hints: {
        ...additionalState.hints,
        hintsRevealed: additionalState.hints.hintsRevealed + 1,
        revealedPositions: newRevealedPositions,
      },
    };
    
    const updateDto: UpdateGameStateDto = {
      guessedLetters: newGuessedLetters,
      additionalState: newAdditionalState,
    };
    
    return this.gamesService.updateGameState(gameId, updateDto);
  }

  /**
   * Get max wrong guesses based on difficulty
   */
  private getMaxWrongGuessesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): number {
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
        return 3;
      case 'medium':
        return 2;
      case 'hard':
        return 1;
      default:
        return 2;
    }
  }

  /**
   * Calculate score based on game performance
   */
  private calculateScore(game: Game): number {
    const word = game.word;
    const additionalState = game.additionalState as HangmanAdditionalState;
    const hintsUsed = additionalState.hints.hintsRevealed;
    const wrongGuesses = game.wrongGuesses || 0;
    
    // Base score based on word length
    let score = word.length * 10;
    
    // Deduct points for wrong guesses
    score -= wrongGuesses * 5;
    
    // Deduct points for hints used
    score -= hintsUsed * 10;
    
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