import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';
import { SessionProjectionEntity } from '../indexer/entities/session-projection.entity';
import { AchievementSummaryDto, AchievementEntryDto } from './achievement-summary.dto';
import { PlayerSummaryDto } from './player-profile.dto';
import { SessionHistoryDto } from './session-history.dto';
import { CacheLoggerService } from './cache-logger.service';

const CACHE_TTL = {
  achievements: 30_000,
  playerSummary: 15_000,
  sessions: 10_000,
} as const;

@ApiTags('Read API (Projection-backed)')
@Controller('api/v1')
export class ReadApiController {
  constructor(
    @InjectRepository(SessionProjectionEntity)
    private readonly sessionsRepo: Repository<SessionProjectionEntity>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly cacheLogger: CacheLoggerService,
  ) {}

  @Get('achievements/:address')
  @ApiOperation({
    summary: 'Get achievement unlock summary for a player',
    description:
      'Returns unlocked, pending, and unavailable achievement states from projection data.',
  })
  @ApiOkResponse({ type: AchievementSummaryDto })
  async getAchievementSummary(
    @Param('address') address: string,
  ): Promise<AchievementSummaryDto> {
    const cacheKey = `achievements:${address}`;
    const cached = await this.cache.get<AchievementSummaryDto>(cacheKey);
    if (cached) {
      this.cacheLogger.hit(cacheKey, CACHE_TTL.achievements);
      return cached;
    }
    this.cacheLogger.miss(cacheKey);

    const sessions = await this.sessionsRepo.find({
      where: { player: address },
    });

    const completedDays = sessions.filter((s) => s.finalized).length;

    const achievements: AchievementEntryDto[] = [
      {
        id: 'first_win',
        name: 'First Win',
        state: completedDays >= 1 ? 'unlocked' : 'pending',
        unlockedAt: completedDays >= 1 ? new Date().toISOString() : undefined,
      },
      {
        id: 'streak_3',
        name: '3-Day Streak',
        state: completedDays >= 3 ? 'unlocked' : 'pending',
      },
      {
        id: 'streak_7',
        name: 'Week Warrior',
        state: completedDays >= 7 ? 'unlocked' : 'pending',
      },
      {
        id: 'dedicated',
        name: 'Dedicated Player',
        state: completedDays >= 30 ? 'unlocked' : 'pending',
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        state: 'unavailable',
      },
    ];

    const unlocked = achievements.filter((a) => a.state === 'unlocked').length;

    const result: AchievementSummaryDto = {
      achievements,
      total: achievements.length,
      unlocked,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL.achievements);
    this.cacheLogger.set(cacheKey, CACHE_TTL.achievements);

    return result;
  }

  @Get('players/:address/summary')
  @ApiOperation({
    summary: 'Get player streak and profile summary',
    description:
      'Returns player profile summary including streaks, totals, and recent activity from projection data.',
  })
  @ApiOkResponse({ type: PlayerSummaryDto })
  async getPlayerSummary(
    @Param('address') address: string,
  ): Promise<PlayerSummaryDto> {
    const cacheKey = `playerSummary:${address}`;
    const cached = await this.cache.get<PlayerSummaryDto>(cacheKey);
    if (cached) {
      this.cacheLogger.hit(cacheKey, CACHE_TTL.playerSummary);
      return cached;
    }
    this.cacheLogger.miss(cacheKey);

    const sessions = await this.sessionsRepo.find({
      where: { player: address },
      order: { updatedAt: 'DESC' },
    });

    const totalSessions = sessions.length;
    const finalizedSessions = sessions.filter((s) => s.finalized);
    const totalWins = finalizedSessions.filter((s) => s.status === 'Finalized').length;

    const sortedDates = finalizedSessions
      .map((s) => s.updatedAt)
      .filter(Boolean)
      .sort()
      .reverse();

    let currentStreak = 0;
    const today = new Date();
    for (const date of sortedDates) {
      const diffDays = Math.floor(
        (today.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays <= 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    const lastPlayedAt = sortedDates[0]?.toISOString();

    const result: PlayerSummaryDto = {
      address,
      totalSessions,
      totalWins,
      winRate: totalSessions > 0 ? totalWins / totalSessions : 0,
      streak: {
        currentStreak,
        longestStreak: currentStreak,
        lastPlayedAt,
      },
      source: 'projection',
    };

    await this.cache.set(cacheKey, result, CACHE_TTL.playerSummary);
    this.cacheLogger.set(cacheKey, CACHE_TTL.playerSummary);

    return result;
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Get paginated session history',
    description:
      'Returns paginated session history from projection data, filterable by player address.',
  })
  @ApiQuery({ name: 'player', required: false, description: 'Filter by player wallet address' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiOkResponse({ type: SessionHistoryDto })
  async getSessionHistory(
    @Query('player') player?: string,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ): Promise<SessionHistoryDto> {
    const sanitizedSkip = Math.max(0, Number(skip));
    const sanitizedTake = Math.max(1, Math.min(Number(take), 100));
    const cacheKey = `sessions:${player ?? 'all'}:${sanitizedSkip}:${sanitizedTake}`;

    const cached = await this.cache.get<SessionHistoryDto>(cacheKey);
    if (cached) {
      this.cacheLogger.hit(cacheKey, CACHE_TTL.sessions);
      return cached;
    }
    this.cacheLogger.miss(cacheKey);

    const where = player ? { player } : {};

    const [sessions, total] = await this.sessionsRepo.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      skip: sanitizedSkip,
      take: sanitizedTake,
    });

    const result: SessionHistoryDto = {
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        player: s.player,
        dayId: s.dayId,
        status: s.status,
        attemptsUsed: s.attemptsUsed,
        finalized: s.finalized,
        updatedAt: s.updatedAt.toISOString(),
      })),
      total,
      skip: sanitizedSkip,
      take: sanitizedTake,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL.sessions);
    this.cacheLogger.set(cacheKey, CACHE_TTL.sessions);

    return result;
  }

  async invalidatePlayerCache(address: string): Promise<void> {
    const keys = [`achievements:${address}`, `playerSummary:${address}`];
    await Promise.all(keys.map((k) => this.cache.del(k)));
    this.cacheLogger.invalidation('player-update', keys);
  }

  async invalidateSessionCache(): Promise<void> {
    const keys = ['sessions:all:0:20'];
    await Promise.all(keys.map((k) => this.cache.del(k)));
    this.cacheLogger.invalidation('session-update', keys);
  }
}
