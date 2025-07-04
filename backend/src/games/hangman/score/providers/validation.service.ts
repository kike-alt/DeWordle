import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Score } from '../entities/score.entity';
import { CreateScoreDto } from '../dto';

@Injectable()
export class ValidationService {
  constructor(
    @InjectRepository(Score)
    private scoreRepository: Repository<Score>,
  ) {}

  /**
   * Validate score submissions to prevent cheating
   */
  async validateScoreSubmission(dto: CreateScoreDto): Promise<Score | void> {
    if (dto.word.length !== dto.wordLength) {
      throw new BadRequestException('Word length does not match the provided word');
    }

    const minExpectedTime = Math.max(dto.wordLength * 2, 5); // minimum 5 seconds
    if (dto.timeSpent < minExpectedTime) {
      const score = this.scoreRepository.create({
        ...dto,
        isFlagged: true,
      });
      return this.scoreRepository.save(score);
    }

    if (dto.userId) {
      const recentDuplicates = await this.scoreRepository.count({
        where: {
          userId: dto.userId,
          word: dto.word,
          createdAt: MoreThan(new Date(Date.now() - 10 * 60 * 1000)), // last 10 minutes
        },
      });

      if (recentDuplicates > 0) {
        throw new BadRequestException('Duplicate score submission detected');
      }
    }
  }
}