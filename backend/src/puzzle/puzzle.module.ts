import { Module } from '@nestjs/common';
import { PuzzleService } from './puzzle.service';
import { PuzzleController, AdminPuzzleController } from './puzzle.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Puzzle } from './entities/puzzle.entity';
import { IsGridValid } from './validators/grid.validator';
import { IsSpangramValid } from './validators/spangram.validator';
import { IsDateUnique } from './validators/date-unique.validator';
import { AreValidWordsValid } from './validators/valid-words.validator';
import { IsFutureDate } from './validators/feature-date.validator';
import { PuzzleSession } from './entities/puzzle-session.entity';
import { DictionaryModule } from 'src/dictionary/dictionary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Puzzle, PuzzleSession]),
    DictionaryModule,
  ],
  controllers: [PuzzleController, AdminPuzzleController],
  providers: [
    PuzzleService,
    IsGridValid,
    IsSpangramValid,
    IsDateUnique,
    IsFutureDate,
    AreValidWordsValid,
  ],
  exports: [PuzzleService],
})
export class PuzzleModule {}
