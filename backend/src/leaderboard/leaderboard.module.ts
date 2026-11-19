import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { Game } from '../games/entities/game.entity';
import { UserGameStats } from '../user-game-stats/entities/user-game-stats.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaderboardEntry, Game, UserGameStats])],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
