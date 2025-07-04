import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';
import { PlayerStatistics } from '../interfaces/statistics.interface';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Score)
    private scoreRepository: Repository<Score>,
  ) {}

  async getPlayerStatistics(userId?: string, category?: string): Promise<PlayerStatistics> {
    const queryBuilder = this.scoreRepository.createQueryBuilder('score')
      .where('score.isFlagged = :isFlagged', { isFlagged: false });

    if (userId) {
      queryBuilder.andWhere('score.userId = :userId', { userId });
    }

    if (category) {
      queryBuilder.andWhere('score.category = :category', { category });
    }

    const scores = await queryBuilder.getMany();

    if (scores.length === 0) {
      return {
        totalGames: 0,
        totalScore: 0,
        averageScore: 0,
        bestScore: 0,
        averageTimeSpent: 0,
        averageWrongGuesses: 0,
        gamesPerCategory: {},
        scoresByWordLength: {},
        recentScores: [],
      };
    }

    const totalGames = scores.length;
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
    const averageScore = Math.round(totalScore / totalGames);
    const bestScore = Math.max(...scores.map(s => s.score));
    const averageTimeSpent = Math.round(
      scores.reduce((sum, s) => sum + s.timeSpent, 0) / totalGames
    );
    const averageWrongGuesses = Math.round(
      scores.reduce((sum, s) => sum + s.wrongGuesses, 0) / totalGames
    );

    const categoryCounter: Record<string, number> = {};
    scores.forEach(score => {
      categoryCounter[score.category] = (categoryCounter[score.category] || 0) + 1;
    });

    let favoriteCategory: string | undefined;
    let maxCount = 0;
    Object.entries(categoryCounter).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteCategory = category;
      }
    });

    const wordLengthStats: Record<number, {
      totalGames: number;
      totalScore: number;
      bestScore: number;
    }> = {};

    scores.forEach(score => {
      if (!wordLengthStats[score.wordLength]) {
        wordLengthStats[score.wordLength] = {
          totalGames: 0,
          totalScore: 0,
          bestScore: 0,
        };
      }

      wordLengthStats[score.wordLength].totalGames++;
      wordLengthStats[score.wordLength].totalScore += score.score;
      wordLengthStats[score.wordLength].bestScore = Math.max(
        wordLengthStats[score.wordLength].bestScore,
        score.score
      );
    });

    const scoresByWordLength: Record<number, {
      totalGames: number;
      averageScore: number;
      bestScore: number;
    }> = {};

    Object.entries(wordLengthStats).forEach(([length, stats]) => {
      scoresByWordLength[Number(length)] = {
        totalGames: stats.totalGames,
        averageScore: Math.round(stats.totalScore / stats.totalGames),
        bestScore: stats.bestScore,
      };
    });

    const recentScores = scores
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(s => ({
        score: s.score,
        category: s.category,
        word: s.word,
        createdAt: s.createdAt,
      }));

    return {
      totalGames,
      totalScore,
      averageScore,
      bestScore,
      averageTimeSpent,
      averageWrongGuesses,
      favoriteCategory,
      gamesPerCategory: categoryCounter,
      scoresByWordLength,
      recentScores,
    };
  }

  async getGlobalStatistics(category?: string): Promise<any> {
    const queryBuilder = this.scoreRepository.createQueryBuilder('score')
      .where('score.isFlagged = :isFlagged', { isFlagged: false });

    if (category) {
      queryBuilder.andWhere('score.category = :category', { category });
    }

    const totalScores = await queryBuilder.getCount();

    const averageScore = await queryBuilder
      .select('AVG(score.score)', 'avg')
      .getRawOne()
      .then(result => Math.round(result.avg || 0));

    const highestScore = await queryBuilder
      .orderBy('score.score', 'DESC')
      .getOne();

    const categoryData = await queryBuilder
      .select('score.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('score.category')
      .getRawMany();

    const categoryDistribution = categoryData.reduce((acc, item) => {
      acc[item.category] = parseInt(item.count);
      return acc;
    }, {});

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyScores = await queryBuilder
      .select('DATE(score.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(score.score)', 'avgScore')
      .where('score.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      totalScores,
      averageScore,
      highestScore: highestScore ? {
        score: highestScore.score,
        username: highestScore.username || 'Anonymous',
        category: highestScore.category,
        word: highestScore.word,
        createdAt: highestScore.createdAt,
      } : null,
      categoryDistribution,
      dailyScores: dailyScores.map(item => ({
        date: item.date,
        count: parseInt(item.count),
        averageScore: Math.round(item.avgScore),
      })),
    };
  }
}