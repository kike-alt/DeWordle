import { Injectable } from '@nestjs/common';
import { HangmanStateService } from './hangman-state.service';
import { GamesService } from '../games.service';

@Injectable()
export class HangmanService {
  constructor(
    private readonly hangmanStateService: HangmanStateService,
    private readonly gamesService: GamesService,
  ) {}

  /**
   * Helper to get word mask based on current guesses
   * Shows correctly guessed letters and hides unguessed letters
   */
  getMaskedWord(word: string, guessedLetters: string[]): string {
    return word
      .split('')
      .map((letter) =>
        guessedLetters.includes(letter.toLowerCase()) ? letter : '_',
      )
      .join('');
  }

  /**
   * Helper to get remaining attempts
   */
  getRemainingAttempts(maxWrongGuesses: number, wrongGuesses: number): number {
    return Math.max(0, maxWrongGuesses - wrongGuesses);
  }

  /**
   * Helper to get guessed letters categorized as correct and incorrect
   */
  categorizeGuesses(
    word: string,
    guessedLetters: string[],
  ): {
    correct: string[];
    incorrect: string[];
  } {
    const wordLetters = new Set(word.toLowerCase().split(''));

    return {
      correct: guessedLetters.filter((letter) => wordLetters.has(letter)),
      incorrect: guessedLetters.filter((letter) => !wordLetters.has(letter)),
    };
  }

  /**
   * Helper to generate a game summary
   */
  async generateGameSummary(gameId: string): Promise<{
    word: string;
    maskedWord: string;
    category: string;
    guessedLetters: string[];
    correctGuesses: string[];
    incorrectGuesses: string[];
    remainingAttempts: number;
    hintsRemaining: number;
    status: string;
    score: number;
  }> {
    const game = await this.gamesService.getGameById(gameId);
    const additionalState = game.additionalState as any;

    const guessedLetters = game.guessedLetters || [];
    const { correct, incorrect } = this.categorizeGuesses(
      game.word,
      guessedLetters,
    );

    return {
      word: game.word,
      maskedWord: this.getMaskedWord(game.word, guessedLetters),
      category: game.category,
      guessedLetters,
      correctGuesses: correct,
      incorrectGuesses: incorrect,
      remainingAttempts: this.getRemainingAttempts(
        additionalState.maxWrongGuesses,
        game.wrongGuesses || 0,
      ),
      hintsRemaining:
        additionalState.hints.maxHints - additionalState.hints.hintsRevealed,
      status: game.status,
      score: game.score,
    };
  }
}
