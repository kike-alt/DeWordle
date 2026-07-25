import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestedEventDto } from '../dto/ingested-event.dto';
import { IngestedEventEntity } from '../entities/ingested-event.entity';
import { ProjectionService } from '../projections/projection.service';
import { AdminRegistryProcessorService } from './admin-registry-processor.service';
import { IndexerLogContext } from '../indexer.service';
import { computeAuditEventHash } from '../audit/event-hash';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);
  private replaySkipCount = 0;

  constructor(
    @InjectRepository(IngestedEventEntity)
    private readonly eventsRepo: Repository<IngestedEventEntity>,
    private readonly projectionService: ProjectionService,
    private readonly adminRegistryProcessor: AdminRegistryProcessorService,
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
    return true;
  }

  getReplaySkipCount(): number {
    return this.replaySkipCount;
  }
}
