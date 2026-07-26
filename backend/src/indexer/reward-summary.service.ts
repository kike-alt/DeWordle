import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionProjectionEntity } from './entities/session-projection.entity';
import { RewardSummaryDto } from '../common/dto/reward-summary.dto';

/**
 * Points multiplier used to derive accrued tokens from attempts used.
 * Sessions solved in fewer attempts score higher — this mirrors the
 * on-chain scoring curve without requiring a live RPC call.
 * MAX_ATTEMPTS (6) - attemptsUsed + 1 gives 6 pts for 1-attempt solves,
 * down to 1 pt for 6-attempt solves.
 */
const MAX_ATTEMPTS = 6;
const POINTS_PER_LOST_SESSION = 0;

function attemptsToPoints(attemptsUsed: number, status: string): number {
  const won =
    status.toLowerCase() === 'won' || status.toLowerCase() === 'finalized';
  if (!won) return POINTS_PER_LOST_SESSION;
  const clamped = Math.max(1, Math.min(attemptsUsed, MAX_ATTEMPTS));
  return MAX_ATTEMPTS - clamped + 1;
}

@Injectable()
export class RewardSummaryService {
  constructor(
    @InjectRepository(SessionProjectionEntity)
    private readonly sessionsRepo: Repository<SessionProjectionEntity>,
  ) {}

  async getForPlayer(
    network: string,
    player: string,
  ): Promise<RewardSummaryDto> {
    const sessions = await this.sessionsRepo.find({
      where: { network, player, finalized: true },
      order: { updatedAt: 'DESC' },
    });

    if (sessions.length === 0) {
      return {
        accrued: 0,
        claimed: 0,
        pendingClaim: 0,
        sessionCount: 0,
        state: 'unavailable',
      };
    }

    const accrued = sessions.reduce(
      (sum, s) => sum + attemptsToPoints(s.attemptsUsed, s.status),
      0,
    );

    // claimed is tracked via 'reward_claimed' events — for now we surface 0
    // and mark state as 'pending' so the frontend knows data exists but the
    // claim read path is not yet wired to on-chain events.
    const claimed = 0;

    return {
      accrued,
      claimed,
      pendingClaim: accrued - claimed,
      sessionCount: sessions.length,
      state: 'pending',
      lastUpdatedAt: sessions[0]?.updatedAt?.toISOString(),
    };
  }
}
