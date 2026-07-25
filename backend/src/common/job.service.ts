import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import {
  JOB_QUEUES,
  JobQueueName,
  JOB_RETRY_ATTEMPTS,
  JOB_BACKOFF_DELAY_MS,
  JOB_BACKOFF_TYPE,
} from './job.constants';

export interface RewardJobData {
  sessionId: string;
  playerId: string;
  outcome: 'won' | 'lost';
  dayId: number;
}

export interface AchievementJobData {
  playerId: string;
  metric: string;
  value: number;
}

export interface AnalyticsJobData {
  dayId: number;
  aggregateType: 'sessions' | 'rewards' | 'achievements';
}

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectQueue(JOB_QUEUES.REWARD_CALCULATION)
    private readonly rewardQueue: Queue<RewardJobData>,
    @InjectQueue(JOB_QUEUES.ACHIEVEMENT_CHECK)
    private readonly achievementQueue: Queue<AchievementJobData>,
    @InjectQueue(JOB_QUEUES.ANALYTICS_AGGREGATE)
    private readonly analyticsQueue: Queue<AnalyticsJobData>,
  ) {}

  async addRewardCalculation(data: RewardJobData): Promise<Job<RewardJobData>> {
    const job = await this.rewardQueue.add('calculate', data, {
      attempts: JOB_RETRY_ATTEMPTS,
      backoff: { type: JOB_BACKOFF_TYPE, delay: JOB_BACKOFF_DELAY_MS },
    });
    this.logger.debug(`Reward calculation job ${job.id} queued for session ${data.sessionId}`);
    return job;
  }

  async addAchievementCheck(data: AchievementJobData): Promise<Job<AchievementJobData>> {
    const job = await this.achievementQueue.add('check', data, {
      attempts: JOB_RETRY_ATTEMPTS,
      backoff: { type: JOB_BACKOFF_TYPE, delay: JOB_BACKOFF_DELAY_MS },
    });
    this.logger.debug(`Achievement check job ${job.id} queued for player ${data.playerId}`);
    return job;
  }

  async addAnalyticsAggregate(data: AnalyticsJobData): Promise<Job<AnalyticsJobData>> {
    const job = await this.analyticsQueue.add('aggregate', data, {
      attempts: JOB_RETRY_ATTEMPTS,
      backoff: { type: JOB_BACKOFF_TYPE, delay: JOB_BACKOFF_DELAY_MS },
    });
    this.logger.debug(`Analytics aggregate job ${job.id} queued for day ${data.dayId}`);
    return job;
  }

  async getQueueStats() {
    const [rewardWaiting, rewardActive, rewardCompleted, rewardFailed] = await Promise.all([
      this.rewardQueue.getWaitingCount(),
      this.rewardQueue.getActiveCount(),
      this.rewardQueue.getCompletedCount(),
      this.rewardQueue.getFailedCount(),
    ]);

    const [achWaiting, achActive, achCompleted, achFailed] = await Promise.all([
      this.achievementQueue.getWaitingCount(),
      this.achievementQueue.getActiveCount(),
      this.achievementQueue.getCompletedCount(),
      this.achievementQueue.getFailedCount(),
    ]);

    const [anaWaiting, anaActive, anaCompleted, anaFailed] = await Promise.all([
      this.analyticsQueue.getWaitingCount(),
      this.analyticsQueue.getActiveCount(),
      this.analyticsQueue.getCompletedCount(),
      this.analyticsQueue.getFailedCount(),
    ]);

    return {
      [JOB_QUEUES.REWARD_CALCULATION]: {
        waiting: rewardWaiting,
        active: rewardActive,
        completed: rewardCompleted,
        failed: rewardFailed,
      },
      [JOB_QUEUES.ACHIEVEMENT_CHECK]: {
        waiting: achWaiting,
        active: achActive,
        completed: achCompleted,
        failed: achFailed,
      },
      [JOB_QUEUES.ANALYTICS_AGGREGATE]: {
        waiting: anaWaiting,
        active: anaActive,
        completed: anaCompleted,
        failed: anaFailed,
      },
    };
  }

  async getDeadLetterJobs(queueName: JobQueueName) {
    let queue: Queue;
    switch (queueName) {
      case JOB_QUEUES.REWARD_CALCULATION:
        queue = this.rewardQueue;
        break;
      case JOB_QUEUES.ACHIEVEMENT_CHECK:
        queue = this.achievementQueue;
        break;
      case JOB_QUEUES.ANALYTICS_AGGREGATE:
        queue = this.analyticsQueue;
        break;
    }
    return queue.getFailed(0, 100);
  }
}
