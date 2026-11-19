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
import { AuthModule } from '../../auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { WordValidationThrottlerGuard } from './word-validation-throttler.guard';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Word]),
    AuthModule,
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'wordValidation', ttl: 60_000, limit: 60 }],
    }),
  ],
  controllers: [WordsController],
  providers: [
    WordsService,
    WordSeedService,
    WordScheduler,
    WordScoringProvider,
    WordValidationProvider,
    WordValidationService,
    EnrichedWordsProvider,
    WordValidationThrottlerGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [WordsService, WordSeedService, WordValidationService],
})
export class WordsModule {}
