import { Module } from '@nestjs/common';
import { UserGamesController } from './user-games.controller';
import { UserGamesService } from './user-games.service';
import { UserGame } from './entities/user-game.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Puzzle } from '../puzzles/entities/puzzle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserGame]),
    TypeOrmModule.forFeature([Puzzle]),
  ],
  providers: [UserGamesService],
  exports: [UserGamesService],
  controllers: [UserGamesController],
})
export class UserGamesModule {}
