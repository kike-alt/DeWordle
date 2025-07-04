import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';
import { CreateScoreDto } from '../dto';
import { ValidationService } from './validation.service';
import { LeaderboardService } from './leaderboard.service';
import { StatisticsService } from './statistics.service';

@Injectable()
export class ScoreService {
  constructor(
    @InjectRepository(Score)
    private scoreRepository: Repository<Score>,
    private validationService: ValidationService,
    private leaderboardService: LeaderboardService,
    private statisticsService: StatisticsService,
  ) {}

  /**
   * Create a new score entry with validation
   */
  async create(createScoreDto: CreateScoreDto): Promise<Score> {
    // Validate the score submission
    const flaggedScore = await this.validationService.validateScoreSubmission(createScoreDto);
    if (flaggedScore) {
      return flaggedScore;
    }

    const score = this.scoreRepository.create(createScoreDto);

    // Set default values for anonymous users
    if (!score.userId && !score.username) {
      score.username = 'Anonymous';
    }

    return this.scoreRepository.save(score);
  }

  async flagSuspiciousScore(id: number): Promise<Score> {
    const score = await this.scoreRepository.findOneOrFail({ where: { id } });
    score.isFlagged = true;
    return this.scoreRepository.save(score);
  }

  async verifyScore(id: number): Promise<Score> {
    const score = await this.scoreRepository.findOneOrFail({ where: { id } });
    score.isFlagged = false;
    score.isVerified = true;
    return this.scoreRepository.save(score);
  }
}