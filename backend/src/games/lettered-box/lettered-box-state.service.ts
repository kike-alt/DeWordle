import { Injectable } from '@nestjs/common';
import { GamesService } from '../games.service';
import { CreateGameDto, UpdateGameStateDto } from '../dtos/game.dto';
import { Game } from '../entities/game.entity';

export interface LetteredBoxBoardLayout {
  top: string[];
  right: string[];
  bottom: string[];
  left: string[];
}

export interface LetteredBoxAdditionalState {
  board: LetteredBoxBoardLayout;
  submittedWords: string[];
  currentChain: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  minUniqueLetters: number;
  minWords: number;
  timeLimit: number; // in seconds
  hints: {
    hintsRevealed: number;
    maxHints: number;
    suggestedWords: string[];
  };
}

@Injectable()
export class LetteredBoxStateService {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * Create a new Lettered Box game
   */
  async createLetteredBoxGame(
    userId: string,
    board?: LetteredBoxBoardLayout,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  ): Promise<Game> {
    // Generate a board if not provided
    if (!board) {
      board = this.generateBoard();
    }
    
    // Set up game parameters based on difficulty
    const difficultySettings = this.getDifficultySettings(difficulty);
    
    const additionalState: LetteredBoxAdditionalState = {
      board,
      submittedWords: [],
      currentChain: [],
      difficulty,
      minUniqueLetters: difficultySettings.minUniqueLetters,
      minWords: difficultySettings.minWords,
      timeLimit: difficultySettings.timeLimit,
      hints: {
        hintsRevealed: 0,
        maxHints: difficultySettings.maxHints,
        suggestedWords: [],
      },
    };

    const createGameDto: CreateGameDto = {
      userId,
      gameType: 'lettered-box',
      category: 'word-game',
      additionalState,
    };

    return this.gamesService.createGame(createGameDto);
  }

  /**
   * Submit a chain of words as a solution
   */
  async submitSolution(
    gameId: string,
    words: string[],
  ): Promise<Game> {
    // Get the current game state
    const game = await this.gamesService.getGameById(gameId);
    
    if (game.status !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }
    
    const additionalState = game.additionalState as LetteredBoxAdditionalState;
    
    // Validate the solution
    const validationResult = await this.validateSolution(words, additionalState);
    
    if (!validationResult.isValid) {
      throw new Error(validationResult.message);
    }
    
    // Update game state with submitted words
    const newAdditionalState: LetteredBoxAdditionalState = {
      ...additionalState,
      submittedWords: words,
      currentChain: words,
    };
    
    // Calculate score based on word count and unique letters used
    const score = this.calculateScore(words, additionalState);
    
    const updateDto: UpdateGameStateDto = {
      additionalState: newAdditionalState,
      score,
      status: 'WON', // Consider completed if solution is valid
    };
    
    return this.gamesService.updateGameState(gameId, updateDto);
  }

  /**
   * Add a word to the current chain
   */
  async addWordToChain(
    gameId: string,
    word: string,
  ): Promise<Game> {
    // Get the current game state
    const game = await this.gamesService.getGameById(gameId);
    
    if (game.status !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }
    
    const additionalState = game.additionalState as LetteredBoxAdditionalState;
    const currentChain = [...additionalState.currentChain];
    
    // Validate if this word can be added to the chain
    if (currentChain.length > 0) {
      const lastWord = currentChain[currentChain.length - 1];
      const lastLetter = lastWord.slice(-1).toLowerCase();
      const firstLetter = word[0].toLowerCase();
      
      if (lastLetter !== firstLetter) {
        throw new Error(`Word must begin with '${lastLetter}'`);
      }
    }
    
    // Add word to chain
    currentChain.push(word);
    
    // Update game state
    const newAdditionalState: LetteredBoxAdditionalState = {
      ...additionalState,
      currentChain,
    };
    
    const updateDto: UpdateGameStateDto = {
      additionalState: newAdditionalState,
    };
    
    return this.gamesService.updateGameState(gameId, updateDto);
  }

  /**
   * Use a hint to get a suggested word
   */
  async useHint(gameId: string): Promise<Game> {
    // Get the current game state
    const game = await this.gamesService.getGameById(gameId);
    
    if (game.status !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }
    
    const additionalState = game.additionalState as LetteredBoxAdditionalState;
    
    // Check if hints are available
    if (additionalState.hints.hintsRevealed >= additionalState.hints.maxHints) {
      throw new Error('No hints remaining');
    }
    
    // Generate a suggested word based on current chain
    const suggestedWord = this.generateHintWord(additionalState);
    
    if (!suggestedWord) {
      throw new Error('Could not generate a hint at this time');
    }
    
    // Update the game state
    const newSuggestedWords = [...additionalState.hints.suggestedWords, suggestedWord];
    
    const newAdditionalState: LetteredBoxAdditionalState = {
      ...additionalState,
      hints: {
        ...additionalState.hints,
        hintsRevealed: additionalState.hints.hintsRevealed + 1,
        suggestedWords: newSuggestedWords,
      },
    };
    
    const updateDto: UpdateGameStateDto = {
      additionalState: newAdditionalState,
    };
    
    return this.gamesService.updateGameState(gameId, updateDto);
  }

  /**
   * Validate if the solution meets the game rules
   */
  private async validateSolution(
    words: string[],
    state: LetteredBoxAdditionalState,
  ): Promise<{ isValid: boolean; message: string }> {
    // Check if empty submission
    if (words.length === 0) {
      return { isValid: false, message: 'No words submitted.' };
    }
    
    // Check minimum word count
    if (words.length < state.minWords) {
      return { 
        isValid: false, 
        message: `Solution must include at least ${state.minWords} words.` 
      };
    }
    
    // Check chaining rule (last letter of word[i] == first letter of word[i+1])
    for (let i = 0; i < words.length - 1; i++) {
      const lastChar = words[i].slice(-1).toLowerCase();
      const nextFirst = words[i + 1][0].toLowerCase();
      
      if (lastChar !== nextFirst) {
        return {
          isValid: false,
          message: `Word ${words[i + 1]} must begin with '${lastChar}'`,
        };
      }
    }
    
    // Check minimum unique letters used
    const uniqueLetters = new Set(words.join('').toLowerCase());
    if (uniqueLetters.size < state.minUniqueLetters) {
      return {
        isValid: false,
        message: `Solution must use at least ${state.minUniqueLetters} unique letters.`,
      };
    }
    
    return { isValid: true, message: 'Valid solution!' };
  }

  /**
   * Calculate score based on word count and unique letters
   */
  private calculateScore(words: string[], state: LetteredBoxAdditionalState): number {
    const uniqueLetters = new Set(words.join('').toLowerCase());
    const wordCount = words.length;
    
    // Base score calculation
    let score = wordCount * 10; // 10 points per word
    
    // Bonus for unique letters
    score += uniqueLetters.size * 5; // 5 points per unique letter
    
    // Bonus for exceeding minimum requirements
    if (wordCount > state.minWords) {
      score += (wordCount - state.minWords) * 15; // 15 extra points per word above minimum
    }
    
    if (uniqueLetters.size > state.minUniqueLetters) {
      score += (uniqueLetters.size - state.minUniqueLetters) * 10; // 10 extra points per letter above minimum
    }
    
    // Apply difficulty multiplier
    switch (state.difficulty) {
      case 'easy':
        score = Math.round(score * 0.8);
        break;
      case 'medium':
        // No adjustment for medium
        break;
      case 'hard':
        score = Math.round(score * 1.25);
        break;
    }
    
    return score;
  }

  /**
   * Generate a board with letters
   */
  private generateBoard(): LetteredBoxBoardLayout {
    // Simple implementation for demo purposes
    // In a real implementation, you might want more sophisticated letter distribution
    const consonants = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
    const vowels = 'AEIOU'.split('');
    
    const getRandomLetters = (source: string[], count: number) => {
      const result = [];
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * source.length);
        result.push(source[randomIndex]);
      }
      return result;
    };
    
    // Ensure at least one vowel in each side
    const top = [vowels[Math.floor(Math.random() * vowels.length)], ...getRandomLetters(consonants, 2)];
    const right = [vowels[Math.floor(Math.random() * vowels.length)], ...getRandomLetters(consonants, 2)];
    const bottom = [vowels[Math.floor(Math.random() * vowels.length)], ...getRandomLetters(consonants, 2)];
    const left = [vowels[Math.floor(Math.random() * vowels.length)], ...getRandomLetters(consonants, 2)];
    
    return { top, right, bottom, left };
  }

  /**
   * Get difficulty settings
   */
  private getDifficultySettings(difficulty: 'easy' | 'medium' | 'hard'): {
    minUniqueLetters: number;
    minWords: number;
    timeLimit: number;
    maxHints: number;
  } {
    switch (difficulty) {
      case 'easy':
        return {
          minUniqueLetters: 4,
          minWords: 3,
          timeLimit: 300, // 5 minutes
          maxHints: 3,
        };
      case 'medium':
        return {
          minUniqueLetters: 6,
          minWords: 5,
          timeLimit: 240, // 4 minutes
          maxHints: 2,
        };
      case 'hard':
        return {
          minUniqueLetters: 8,
          minWords: 7,
          timeLimit: 180, // 3 minutes
          maxHints: 1,
        };
      default:
        return {
          minUniqueLetters: 6,
          minWords: 5,
          timeLimit: 240,
          maxHints: 2,
        };
    }
  }

  /**
   * Generate a hint word based on current chain
   */
  private generateHintWord(state: LetteredBoxAdditionalState): string | null {
    // This is a simplified implementation
    // In a real game, you'd have a dictionary and more sophisticated word selection
    
    const currentChain = state.currentChain;
    
    // Sample words that could be used as hints
    const sampleWords = [
      'apple', 'elephant', 'tiger', 'rabbit', 'turtle',
      'eagle', 'dog', 'goat', 'tree', 'eagle',
      'lamp', 'potato', 'orange', 'egg', 'game'
    ];
    
    if (currentChain.length === 0) {
      // If no words in chain yet, return any word
      const randomIndex = Math.floor(Math.random() * sampleWords.length);
      return sampleWords[randomIndex];
    }
    
    // Find a word that starts with the last letter of the last word in the chain
    const lastWord = currentChain[currentChain.length - 1];
    const lastLetter = lastWord.slice(-1).toLowerCase();
    
    const possibleWords = sampleWords.filter(word => 
      word[0].toLowerCase() === lastLetter && 
      !state.currentChain.includes(word)
    );
    
    if (possibleWords.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * possibleWords.length);
    return possibleWords[randomIndex];
  }
}