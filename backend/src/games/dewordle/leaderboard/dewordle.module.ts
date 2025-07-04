import { Module, forwardRef } from '@nestjs/common';
import { LeaderboardModule } from './leaderboard.module';
import { ResultModule } from '../result/result.module';
import { WordsModule } from '../words/words.module';
import { GamesModule } from '../../games.module';
import { DewordleController } from '../dewordle.controller';
import { DewordleStateService } from '../dewordle-state.service';
import { DewordleService } from '../dewordle.service';

@Module({
  imports: [
    LeaderboardModule,
    ResultModule,
    WordsModule,
    forwardRef(() => GamesModule),
  ],
  controllers: [DewordleController],
  providers: [DewordleService, DewordleStateService],
  exports: [DewordleService, DewordleStateService],
})
export class DewordleModule {}
