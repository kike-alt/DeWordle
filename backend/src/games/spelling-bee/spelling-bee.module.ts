import { Module } from '@nestjs/common';
import { PuzzlesModule } from './puzzles/puzzles.module';
import { UserGamesModule } from './user-games/user-games.module';

@Module({
  imports: [PuzzlesModule, UserGamesModule],
})
export class SpellingBeeModule {}
