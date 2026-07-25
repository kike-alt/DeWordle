import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordsService } from './words.service';
import { WordsController } from './words.controller';
import { Word } from '../../entities/word.entity';
import { WordSeedService } from '../../utils/word-seed.service';
import { WordScheduler } from './word.scheduler';
import { WordScoringProvider } from './providers/word-scoring-provider';
import { WordValidationProvider } from './providers/word-validation-provider';
import { WordValidationService } from './word-validation.service';
import { EnrichedWordsProvider } from './providers/enriched-words';

@Module({
  imports: [TypeOrmModule.forFeature([Word])],
  controllers: [WordsController],
  providers: [
    WordsService,
    WordSeedService,
    WordScheduler,
    WordScoringProvider,
    WordValidationProvider,
    WordValidationService,
    EnrichedWordsProvider,
  ],
  exports: [WordsService, WordSeedService, WordValidationService],
})
export class WordsModule {}
