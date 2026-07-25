import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { type User } from '../auth/entities/user.entity';
import { type Game } from '../games/entities/game.entity';

@Injectable()
export class LeaderboardService {
  // Logger removed for production cleanliness
  constructor(
    @InjectRepository(LeaderboardEntry)
    private leaderboardRepository: Repository<LeaderboardEntry>,
  ) {}

  async upsertEntry(user: User, game: Game, score: number, win: boolean) {
    if (!user) {
      return;
    }
    try {
      let entry = await this.leaderboardRepository.findOne({
        where: { user, game },
      });
      if (!entry) {
        entry = this.leaderboardRepository.create({
          user,
          game,
          totalScore: score,
          wins: win ? 1 : 0,
          totalSessions: 1,
        });
      } else {
        entry.totalScore += score;
        entry.wins += win ? 1 : 0;
        entry.totalSessions += 1;
      }
      return await this.leaderboardRepository.save(entry);
    } catch {
      throw new InternalServerErrorException('Could not update leaderboard');
    }
  }

  async getGameLeaderboard(game: Game, skip = 0, take = 20) {
    if (!game) throw new NotFoundException('Game not found');
    try {
      return await this.leaderboardRepository.find({
        where: { game },
        order: { totalScore: 'DESC', lastUpdated: 'DESC' },
        skip: Math.max(0, Number(skip)),
        take: Math.max(1, Math.min(Number(take), 100)), // limit page size
        relations: ['user'],
      });
    } catch {
      throw new InternalServerErrorException(
        'Could not fetch game leaderboard',
      );
    }
  }

  async getGlobalLeaderboard(skip = 0, take = 20) {
    try {
      const qb = this.leaderboardRepository
        .createQueryBuilder('entry')
        .innerJoin('entry.user', 'user') // Only include entries with a user
        .select('user.id', 'userId')
        .addSelect('SUM(entry.totalScore)', 'totalScore')
        .addSelect('SUM(entry.wins)', 'wins')
        .addSelect('SUM(entry.totalSessions)', 'totalSessions')
        .addSelect('MAX(entry.lastUpdated)', 'lastUpdated')
        .groupBy('user.id')
        .orderBy('SUM(entry.totalScore)', 'DESC')
        .addOrderBy('MAX(entry.lastUpdated)', 'DESC')
        .offset(Math.max(0, Number(skip)))
        .limit(Math.max(1, Math.min(Number(take), 100)));
      return await qb.getRawMany();
    } catch {
      throw new InternalServerErrorException(
        'Could not fetch global leaderboard',
      );
    }
  }
}
