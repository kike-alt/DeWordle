import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGameStats } from './entities/user-game-stats.entity';
import { UserGameStatsService } from './user-game-stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserGameStats])],
  providers: [UserGameStatsService],
  exports: [UserGameStatsService],
})
export class UserGameStatsModule {}
