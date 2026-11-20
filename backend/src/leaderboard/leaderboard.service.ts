import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { type User } from '../auth/entities/user.entity';
import { type Game } from '../games/entities/game.entity';
import { UserGameStats } from '../user-game-stats/entities/user-game-stats.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardEntry)
    private readonly leaderboardRepository: Repository<LeaderboardEntry>,
    @InjectRepository(UserGameStats)
    private readonly userGameStatsRepository: Repository<UserGameStats>,
  ) {}

  async upsertEntry(user: User, game: Game, score: number, win: boolean) {
    if (!user) {
      return;
    }
    try {
      let entry = await this.leaderboardRepository.findOne({
        where: { user: { id: user.id }, game: { id: game.id } },
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
        where: { game: { id: game.id } },
        order: { totalScore: 'DESC', lastUpdated: 'DESC' },
        skip: Math.max(0, Number(skip)),
        take: Math.max(1, Math.min(Number(take), 100)), // limit page size
        relations: { user: true },
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

    async getStreakLeaderboard(
      limit = 20,
      offset = 0,
      period: 'all-time' | 'monthly' = 'all-time',
    ) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('limit must be an integer between 1 and 100');
      }
      if (!Number.isInteger(offset) || offset < 0) {
        throw new BadRequestException('offset must be a non-negative integer');
      }

      const query = this.userGameStatsRepository
        .createQueryBuilder('stats')
        .innerJoin('stats.user', 'user')
        .select('user.walletAddress', 'address')
        .addSelect('MAX(stats.currentStreak)', 'currentStreak')
        .addSelect('MAX(stats.longestStreak)', 'maxStreak')
        .where('user.walletAddress IS NOT NULL')
        .groupBy('user.id')
        .addGroupBy('user.walletAddress');

      if (period === 'monthly') {
        const now = new Date();
        const monthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        )
          .toISOString()
          .slice(0, 10);
        query.andWhere('stats.lastPlayedDate >= :monthStart', { monthStart });
      } else if (period !== 'all-time') {
        throw new BadRequestException('period must be all-time or monthly');
      }

      const rows = await query
        .orderBy('MAX(stats.longestStreak)', 'DESC')
        .addOrderBy('MAX(stats.currentStreak)', 'DESC')
        .addOrderBy('user.id', 'ASC')
        .offset(offset)
        .limit(limit)
        .getRawMany<{
          address: string;
          currentStreak: number | string;
          maxStreak: number | string;
        }>();

      return rows.map((row, index) => ({
        rank: offset + index + 1,
        address: row.address,
        currentStreak: Number(row.currentStreak),
        maxStreak: Number(row.maxStreak),
      }));
    }
  }
}
