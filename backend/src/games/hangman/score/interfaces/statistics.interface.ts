export interface PlayerStatistics {
    totalGames: number;
    totalScore: number;
    averageScore: number;
    bestScore: number;
    averageTimeSpent: number;
    averageWrongGuesses: number;
    favoriteCategory?: string;
    gamesPerCategory: Record<string, number>;
    scoresByWordLength: Record<number, { 
      totalGames: number;
      averageScore: number;
      bestScore: number;
    }>;
    recentScores: {
      score: number;
      category: string;
      word: string;
      createdAt: Date;
    }[];
  }
  

