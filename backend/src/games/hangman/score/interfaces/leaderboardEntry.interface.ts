export interface LeaderboardEntry {
    id: number;
    userId?: string;
    username?: string;
    score: number;
    word: string;
    category: string;
    wordLength: number;
    wrongGuesses: number;
    timeSpent: number;
    createdAt: Date;
    rank: number;
  }