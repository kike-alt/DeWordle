import { Module } from '@nestjs/common';
import { PuzzlesController } from './puzzles.controller';
import { PuzzlesService } from './puzzles.service';
import { Puzzle } from './entities/puzzle.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGame } from '../user-games/entities/user-game.entity';
import { WordValidatorService } from './providers/word-validator-service.service';
import { DictionaryService } from 'src/dictionary/dictionary.service';

@Module({
  imports: [TypeOrmModule.forFeature([Puzzle, UserGame])],
  providers: [PuzzlesService, WordValidatorService, DictionaryService],
  exports: [PuzzlesService],
  controllers: [PuzzlesController],
})
export class PuzzlesModule {}
