import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';
import { TimeFrame } from '../enums/timeFrame.enum';
import { LeaderboardResponse } from '../interfaces/leaderboardResponse.interface';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Score)
    private scoreRepository: Repository<Score>,
  ) {}

  async getLeaderboard(
    category?: string,
    timeframe?: TimeFrame,
    page = 1,
    limit = 10,
  ): Promise<LeaderboardResponse> {
    const queryBuilder = this.scoreRepository.createQueryBuilder('score')
      .where('score.isFlagged = :isFlagged', { isFlagged: false });

    if (category) {
      queryBuilder.andWhere('score.category = :category', { category });
    }

    const now = new Date();
    if (timeframe) {
      let startDate: Date;

      switch (timeframe) {
        case TimeFrame.DAILY:
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case TimeFrame.WEEKLY:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case TimeFrame.MONTHLY:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      if (startDate) {
        queryBuilder.andWhere('score.createdAt >= :startDate', { startDate });
      }
    }

    const totalEntries = await queryBuilder.getCount();

    const skip = (page - 1) * limit;
    const entries = await queryBuilder
      .orderBy('score.score', 'DESC')
      .addOrderBy('score.timeSpent', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    const entriesWithRank = entries.map((entry, index) => ({
      ...entry,
      rank: skip + index + 1,
    }));

    return {
      entries: entriesWithRank,
      totalEntries,
      page,
      limit,
      hasMore: totalEntries > skip + limit,
    };
  }

  async getUserTopScores(userId: string, limit = 10): Promise<Score[]> {
    return this.scoreRepository.find({
      where: { userId, isFlagged: false },
      order: { score: 'DESC' },
      take: limit,
    });
  }
}