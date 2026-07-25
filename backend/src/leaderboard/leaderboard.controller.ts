import { Controller, Get, Param, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { Game } from '../games/entities/game.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboardService: LeaderboardService,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  @Get('global')
  async getGlobalLeaderboard(
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    return this.leaderboardService.getGlobalLeaderboard(
      Number(skip),
      Number(take),
    );
  }

  @Get(':gameSlug')
  async getGameLeaderboard(
    @Param('gameSlug') gameSlug: string,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    const game = await this.gameRepository.findOne({
      where: { slug: gameSlug },
    });
    if (!game) return [];
    return this.leaderboardService.getGameLeaderboard(
      game,
      Number(skip),
      Number(take),
    );
  }
}
