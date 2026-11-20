import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { IndexerController } from './indexer.controller';
import { IndexerService } from './indexer.service';
import { EventProcessorService } from './processors/event-processor.service';
import { EventNormalizerService } from './processors/event-normalizer.service';
import { AdminRegistryProcessorService } from './processors/admin-registry-processor.service';
import { ProjectionService } from './projections/projection.service';
import { CursorService } from './projections/cursor.service';
import { IndexerQueueService } from './queue/indexer-queue.service';
import { IndexerWorkerService } from './queue/indexer-worker.service';
import { ReplayAlertService } from './queue/replay-alert.service';
import { IngestedEventEntity } from './entities/ingested-event.entity';
import { SessionProjectionEntity } from './entities/session-projection.entity';
import { IndexerCursorEntity } from './entities/indexer-cursor.entity';
import { RegistrySnapshotEntity } from './entities/registry-snapshot.entity';
import { AuditTrailEntity } from './entities/audit-trail.entity';
import { RegistrySnapshotService } from './registry/registry-snapshot.service';
import { RewardSummaryService } from './reward-summary.service';
import { RewardSummaryController } from './reward-summary.controller';
import { AuditTrailService } from './audit-trail.service';
import { AuditController } from './audit-trail.controller';
import {
  EventDedupService,
  RedisEventDedupCache,
} from './dedup/event-dedup.service';
import { DayPublishedWebhookService } from './day-published-webhook.service';

export const INDEXER_REDIS_CLIENT = 'INDEXER_REDIS_CLIENT';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IngestedEventEntity,
      SessionProjectionEntity,
      IndexerCursorEntity,
      RegistrySnapshotEntity,
      AuditTrailEntity,
    ]),
    MetricsModule,
  ],
  controllers: [IndexerController, RewardSummaryController, AuditController],
  providers: [
    IndexerService,
    EventProcessorService,
    EventNormalizerService,
    AdminRegistryProcessorService,
    ProjectionService,
    CursorService,
    IndexerQueueService,
    ReplayAlertService,
    IndexerWorkerService,
    RegistrySnapshotService,
    RewardSummaryService,
    AuditTrailService,
    {
      provide: INDEXER_REDIS_CLIENT,
      useFactory: (): Redis =>
        new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        }),
    },
    {
      provide: RedisEventDedupCache,
      useFactory: (client: Redis): RedisEventDedupCache =>
        new RedisEventDedupCache(client),
      inject: [INDEXER_REDIS_CLIENT],
    },
    EventDedupService,
    DayPublishedWebhookService,
  ],
  exports: [
    IndexerService,
    ProjectionService,
    CursorService,
    EventNormalizerService,
    AdminRegistryProcessorService,
    AuditTrailService,
  ],
})
export class IndexerModule {}
