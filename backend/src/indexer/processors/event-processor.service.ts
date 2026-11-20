import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestedEventDto } from '../dto/ingested-event.dto';
import { IngestedEventEntity } from '../entities/ingested-event.entity';
import { ProjectionService } from '../projections/projection.service';
import { AdminRegistryProcessorService } from './admin-registry-processor.service';
import { IndexerLogContext } from '../indexer.service';
import { computeAuditEventHash } from '../audit/event-hash';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DAY_PUBLISHED_EVENT, DayPublishedEvent } from '../day-published.event';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);
  private replaySkipCount = 0;

  constructor(
    @InjectRepository(IngestedEventEntity)
    private readonly eventsRepo: Repository<IngestedEventEntity>,
    private readonly projectionService: ProjectionService,
    private readonly adminRegistryProcessor: AdminRegistryProcessorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async process(
    event: IngestedEventDto,
    context?: IndexerLogContext,
  ): Promise<boolean> {
    const exists = await this.eventsRepo.findOne({
      where: {
        network: event.network,
        txHash: event.txHash,
        eventIndex: event.eventIndex,
      },
    });

    if (exists) {
      this.replaySkipCount++;
      this.logger.debug({
        msg: 'indexer.event.duplicate',
        correlationId: context?.correlationId,
        txHash: event.txHash,
        eventIndex: event.eventIndex,
        totalSkipped: this.replaySkipCount,
      });
      return false;
    }

    const auditHash = computeAuditEventHash({
      network: event.network,
      contractId: event.contractId,
      topic: event.topic,
      txHash: event.txHash,
      ledger: event.ledger,
      eventIndex: event.eventIndex,
      payload: event.payload,
    });

    await this.eventsRepo.save(this.eventsRepo.create({ ...event, auditHash }));
    await this.projectionService.apply(event, context);
    this.adminRegistryProcessor.process(event, context);
    if (event.topic === 'day_published') {
      const dayId = event.payload.dayId;
      const commitmentHash =
        event.payload.commitmentHash ?? event.payload.commitment;
      const maxAttempts = Number(event.payload.maxAttempts);
      if (
        (typeof dayId === 'string' || typeof dayId === 'number') &&
        typeof commitmentHash === 'string' &&
        commitmentHash.length > 0 &&
        Number.isInteger(maxAttempts) &&
        maxAttempts > 0
      ) {
        this.eventEmitter.emit(
          DAY_PUBLISHED_EVENT,
          new DayPublishedEvent(
            dayId,
            event.observedAt?.toISOString() ?? new Date().toISOString(),
            commitmentHash,
            maxAttempts,
          ),
        );
      } else {
        this.logger.warn({
          msg: 'indexer.day_published.webhook_skipped',
          txHash: event.txHash,
          reason: 'invalid_day_published_payload',
        });
      }
    }
    return true;
  }

  getReplaySkipCount(): number {
    return this.replaySkipCount;
  }
}
