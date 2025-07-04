import { Module, forwardRef } from '@nestjs/common';
import { HangmanService } from './hangman.service';
import { HangmanController } from './hangman.controller';
import { HangmanStateService } from './hangman-state.service';
import { GamesModule } from '../games.module';
import { ScoreModule } from './score/score.module';
import { WordsService } from './words/words.service';
import { WordsController } from './words/words.controller';
import { GamesService } from '../games.service';
import { Word } from './words/entities/word.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../entities/game.entity';

@Module({
  providers: [HangmanService, HangmanStateService, WordsService, GamesService],
  exports: [HangmanService, HangmanStateService, WordsService, GamesService],
  imports: [
    ScoreModule,
    forwardRef(() => GamesModule),
    TypeOrmModule.forFeature([Word]),
    TypeOrmModule.forFeature([Game]),
  ],
  controllers: [HangmanController],
})
export class HangmanModule {}
