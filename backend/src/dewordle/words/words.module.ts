import { Module } from '@nestjs/common';
import { WordsService } from '../words/words.service';
import { WordsController } from '../words/words.controller';

@Module({
  controllers: [WordsController],
  providers: [WordsService],
})
export class WordsModule {}
