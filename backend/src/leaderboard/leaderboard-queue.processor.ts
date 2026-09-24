import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

interface LeaderboardJobData {
  dayId: string;
  playerId: string;
  scoreDelta: number;
}

@Processor('leaderboard')
export class LeaderboardQueueProcessor {
  private readonly logger = new Logger(LeaderboardQueueProcessor.name);

  @Process({ name: 'recalculate', concurrency: 1 })
  async handleRecalculate(job: Job<LeaderboardJobData>): Promise<void> {
    const { dayId, playerId, scoreDelta } = job.data;
    this.logger.log(`Updating leaderboard:daily:${dayId} for ${playerId} by ${scoreDelta}`);
    // Atomic ZINCRBY leaderboard:daily:{dayId} scoreDelta playerId would go here.
  }
}

export const leaderboardJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
};
