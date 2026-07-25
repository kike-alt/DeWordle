export const JOB_QUEUES = {
  REWARD_CALCULATION: 'reward-calculation',
  ACHIEVEMENT_CHECK: 'achievement-check',
  ANALYTICS_AGGREGATE: 'analytics-aggregate',
} as const;

export type JobQueueName = (typeof JOB_QUEUES)[keyof typeof JOB_QUEUES];

export const JOB_RETRY_ATTEMPTS = 3;
export const JOB_BACKOFF_DELAY_MS = 1000;
export const JOB_BACKOFF_TYPE = 'exponential' as const;

export const DLQ_MAX_RETRIES = 5;
export const DLQ_TTL_MS = 24 * 60 * 60 * 1000;
