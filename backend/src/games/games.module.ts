import { forwardRef, Module } from '@nestjs/common';
import { DewordleModule } from './dewordle/dewordle.module';
import { SpellingBeeModule } from './spelling-bee/spelling-bee.module';
import { GamesController } from './games.controller';
import { HangmanModule } from './hangman/hangman.module';
// import { PuzzleGeneratorService } from './spelling-bee/services/PuzzleGenerator.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { StrandsModule } from './strands/strands.module';

@Module({
  imports: [DewordleModule, SpellingBeeModule, forwardRef(() => HangmanModule), StrandsModule],
  providers: [/*PuzzleGeneratorService,*/ DictionaryService],
  controllers: [GamesController],
  exports: [/*PuzzleGeneratorService,*/ DictionaryService, StrandsModule],
})
export class GamesModule {}
