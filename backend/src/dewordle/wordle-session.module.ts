import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordleSession } from './entities/wordle-session.entity';
import { WordleSessionController } from './wordle-session.controller';
import { WordleSessionService } from './wordle-session.service';

@Module({
  imports: [TypeOrmModule.forFeature([WordleSession])],
  controllers: [WordleSessionController],
  providers: [WordleSessionService],
  exports: [WordleSessionService],
})
export class WordleSessionModule {}
