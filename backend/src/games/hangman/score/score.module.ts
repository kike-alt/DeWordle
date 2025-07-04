import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from './entities/score.entity';
import { ScoreController } from './controllers/score.controller';
import { ScoreService } from './providers/score.service';
import { ValidationService } from './providers/validation.service';
import { LeaderboardService } from './providers/leaderboard.service';
import { StatisticsService } from './providers/statistics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Score])],
  controllers: [ScoreController],
  providers: [
    ScoreService,
    ValidationService,
    LeaderboardService,
    StatisticsService
  ],
  exports: [
    ScoreService,
    LeaderboardService,
    StatisticsService
  ],
})
export class ScoreModule {}