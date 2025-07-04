import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Game } from '../entities/game.entity';
import { LetteredBoxAdditionalState, LetteredBoxStateService } from './lettered-box-state.service';
import { GamesService } from '../games.service';

@Injectable()
export class LetteredBoxService {
  constructor(
    private readonly letteredBoxStateService: LetteredBoxStateService,
     private readonly gamesService: GamesService,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>
  ) {}

  /**
   * Get a list of all words in the current chain
   */
  async getCurrentChain(gameId: string): Promise<string[]> {
    const game = await this.gamesService.getGameById(gameId);
    const additionalState = game.additionalState as LetteredBoxAdditionalState;
    return additionalState.currentChain;
  }

  /**
   * Helper to calculate unique letters used in a solution
   */
  getUniqueLettersCount(words: string[]): number {
    const uniqueLetters = new Set(words.join('').toLowerCase());
    return uniqueLetters.size;
  }

  /**
   * Helper to check if a word can be added to the current chain
   */
  canAddWordToChain(currentWord: string, nextWord: string): boolean {
    if (!currentWord || !nextWord) return false;
    
    const lastLetter = currentWord.slice(-1).toLowerCase();
    const firstLetter = nextWord[0].toLowerCase();
    
    return lastLetter === firstLetter;
  }

  /**
   * Generate a game summary with all relevant details
   */
  async generateGameSummary(gameId: string): Promise<{
    board: any;
    currentChain: string[];
    uniqueLettersUsed: number;
    minUniqueLetters: number;
    minWords: number;
    hintsRemaining: number;
    suggestedWords: string[];
    difficulty: string;
    score: number;
    status: string;
    timeLimit: number;
  }> {
    const game = await this.gamesService.getGameById(gameId);
    const additionalState = game.additionalState as LetteredBoxAdditionalState;
    
    const uniqueLettersUsed = this.getUniqueLettersCount(additionalState.currentChain);
    
    return {
      board: additionalState.board,
      currentChain: additionalState.currentChain,
      uniqueLettersUsed,
      minUniqueLetters: additionalState.minUniqueLetters,
      minWords: additionalState.minWords,
      hintsRemaining: additionalState.hints.maxHints - additionalState.hints.hintsRevealed,
      suggestedWords: additionalState.hints.suggestedWords,
      difficulty: additionalState.difficulty,
      score: game.score,
      status: game.status,
      timeLimit: additionalState.timeLimit,
    };
  }

  /**
   * Get the leaderboard data for Lettered Box games
   */
  async getLeaderboard(): Promise<any[]> {
    const leaderboardData = await this.gameRepository.find({
      where: {
        gameType: 'lettered-box',
        status: 'WON',
      },
      order: {
        score: 'DESC',
      },
      take: 10,
      select: ['id', 'userId', 'score', 'createdAt', 'updatedAt'],
    });
    
    // Enhance the leaderboard data with additional info
    const enhancedLeaderboard = await Promise.all(
      leaderboardData.map(async (entry) => {
        const game = await this.gamesService.getGameById(entry.id);
        const additionalState = game.additionalState as LetteredBoxAdditionalState;
        
        return {
          id: entry.id,
          userId: entry.userId,
          score: entry.score,
          wordCount: additionalState.submittedWords.length,
          uniqueLetters: this.getUniqueLettersCount(additionalState.submittedWords),
          difficulty: additionalState.difficulty,
          createdAt: entry.createdAt,
          completedAt: entry.updatedAt,
        };
      })
    );
    
    return enhancedLeaderboard;
  }

  /**
   * Calculate progress percentage towards winning
   */
  calculateProgressPercentage(currentState: LetteredBoxAdditionalState): number {
    const uniqueLetters = this.getUniqueLettersCount(currentState.currentChain);
    const wordCount = currentState.currentChain.length;
    
    // Calculate progress based on minimum requirements
    const letterProgress = Math.min(100, (uniqueLetters / currentState.minUniqueLetters) * 100);
    const wordProgress = Math.min(100, (wordCount / currentState.minWords) * 100);
    
    // Average of the two progress metrics
    return Math.round((letterProgress + wordProgress) / 2);
  }

  /**
   * Helper to format time remaining in minutes and seconds
   */
  formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}