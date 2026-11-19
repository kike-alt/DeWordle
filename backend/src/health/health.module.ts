import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import Redis from 'ioredis';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';
import { REDIS_HEALTH_CLIENT } from './health.constants';
import { DetailedHealthController } from './detailed-health.controller';
import { JobModule } from '../common/job.module';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [TerminusModule, JobModule, IndexerModule],
  controllers: [HealthController, DetailedHealthController],
  providers: [
    RedisHealthIndicator,
    {
      provide: REDIS_HEALTH_CLIENT,
      useFactory: (): Redis =>
        new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        }),
    },
  ],
})
export class HealthModule {}
