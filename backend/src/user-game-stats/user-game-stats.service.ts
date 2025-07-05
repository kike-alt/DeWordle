import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGameStats } from './entities/user-game-stats.entity';
import { User } from '../users/entities/user.entity';
import { Game } from '../games/entities/game.entity';
import { startOfDay, subDays, isSameDay } from 'date-fns';

@Injectable()
export class UserGameStatsService {
  constructor(
    @InjectRepository(UserGameStats)
    private statsRepo: Repository<UserGameStats>,
  ) {}

  async updateStats(
    user: User,
    game: Game,
    earnedPoints: number,
    won: boolean,
  ) {
    if (!user?.id) return;

    let stats = await this.statsRepo.findOne({ where: { user, game } });

    const todayUTC = startOfDay(new Date()).toISOString().split('T')[0];
    const yesterdayUTC = startOfDay(subDays(new Date(), 1))
      .toISOString()
      .split('T')[0];

    if (!stats) {
      stats = this.statsRepo.create({
        user,
        game,
        points: earnedPoints,
        wins: won ? 1 : 0,
        currentStreak: 1,
        longestStreak: 1,
        lastPlayedDate: todayUTC,
        totalGamesPlayed: 1,
      });
    } else {
      stats.points += earnedPoints;
      stats.wins += won ? 1 : 0;
      stats.totalGamesPlayed += 1;

      if (stats.lastPlayedDate === todayUTC) {
      } else if (stats.lastPlayedDate === yesterdayUTC) {
        stats.currentStreak += 1;
      } else {
        stats.currentStreak = 1;
      }

      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }

      stats.lastPlayedDate = todayUTC;
    }

    await this.statsRepo.save(stats);
  }
}
