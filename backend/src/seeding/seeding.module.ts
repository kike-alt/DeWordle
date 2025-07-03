import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordSeederService } from './word-seeder.service';
import { Word } from '../games/dewordle/words/entities/word.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Word])],
  providers: [WordSeederService],
  exports: [WordSeederService],
})
export class SeedingModule {}
