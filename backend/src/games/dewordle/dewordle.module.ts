import { Module, forwardRef } from '@nestjs/common';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ResultModule } from './result/result.module';
import { WordsModule } from './words/words.module';
import { GamesModule } from '../games.module';
import { DewordleController } from './dewordle.controller';
import { DewordleStateService } from './dewordle-state.service';
import { DewordleService } from './dewordle.service';
import { GamesService } from '../games.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../entities/game.entity';
import { Word } from './words/entities/word.entity';

@Module({
  imports: [
    LeaderboardModule,
    ResultModule,
    WordsModule,
    forwardRef(() => GamesModule),
    TypeOrmModule.forFeature([Game, Word]),
  ],
  controllers: [DewordleController],
  providers: [
    DewordleService,
    DewordleStateService,
    GamesService,
  ],
  exports: [DewordleService, DewordleStateService, GamesService],
})
export class DewordleModule {}
