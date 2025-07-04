import { LeaderboardEntry } from "./leaderboardEntry.interface";

  
  export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    totalEntries: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }