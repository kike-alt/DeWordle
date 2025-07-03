import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Word } from '../games/dewordle/words/entities/word.entity';
import { WordSeederService } from '../seeding/word-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Word])],
  providers: [WordSeederService],
  exports: [WordSeederService],
})
export class SeedingModule {}
