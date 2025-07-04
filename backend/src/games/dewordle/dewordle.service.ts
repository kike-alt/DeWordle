import { Injectable } from '@nestjs/common';
import { DewordleStateService, DewordleAdditionalState, GuessResult } from './dewordle-state.service';
import { GamesService } from '../games.service';

@Injectable()
export class DewordleService {
  constructor(private readonly dewordleStateService: DewordleStateService,
     private readonly gamesService: GamesService,
  ) {}

  /**
   * Helper to get word with hint positions revealed
   */
  getWordWithHints(word: string, revealedPositions: number[]): string {
    return word
      .split('')
      .map((letter, index) => (revealedPositions.includes(index) ? letter : '_'))
      .join('');
  }

  /**
   * Helper to get remaining attempts
   */
  getRemainingAttempts(maxAttempts: number, currentAttempts: number): number {
    return Math.max(0, maxAttempts - currentAttempts);
  }

  /**
   * Helper to generate a game summary
   */
  async generateGameSummary(gameId: string): Promise<{
    wordLength: number;
    category: string;
    guesses: GuessResult[];
    hintsWord: string;
    remainingAttempts: number;
    hintsRemaining: number;
    status: string;
    score: number;
  }> {
    const game = await this.gamesService.getGameById(gameId);
    const additionalState = game.additionalState as DewordleAdditionalState;
    
    return {
      wordLength: additionalState.wordLength,
      category: game.category,
      guesses: additionalState.guessResults,
      hintsWord: this.getWordWithHints(
        game.word, 
        additionalState.hints.revealedPositions
      ),
      remainingAttempts: this.getRemainingAttempts(
        additionalState.maxAttempts, 
        additionalState.guessResults.length
      ),
      hintsRemaining: additionalState.hints.maxHints - additionalState.hints.hintsRevealed,
      status: game.status,
      score: game.score,
    };
  }
}