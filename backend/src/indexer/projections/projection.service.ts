import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionProjectionEntity } from '../entities/session-projection.entity';
import { IngestedEventDto } from '../dto/ingested-event.dto';
import { IndexerLogContext } from '../indexer.service';
import { CURRENT_PROJECTION_VERSION } from './projection-version';

@Injectable()
export class ProjectionService {
  private readonly logger = new Logger(ProjectionService.name);

  constructor(
    @InjectRepository(SessionProjectionEntity)
    private readonly sessionsRepo: Repository<SessionProjectionEntity>,
  ) {}

  /**
   * Applies an event to the projection. Idempotent: replaying the same
   * session_finalized event produces the same projection state (upsert by sessionId).
   */
  async apply(
    event: IngestedEventDto,
    context?: IndexerLogContext,
  ): Promise<boolean> {
    if (event.topic !== 'session_finalized') {
      return false;
    }

    const sessionId = this.readStringField(event.payload, 'sessionId');
    if (!sessionId) {
      this.logger.warn({
        msg: 'indexer.projection.skipped',
        correlationId: context?.correlationId,
        reason: 'missing_session_id',
        txHash: event.txHash,
      });
      return false;
    }

    const existing = await this.sessionsRepo.findOne({
      where: { network: event.network, sessionId },
    });

    const projection = this.sessionsRepo.create({
      id: existing?.id,
      network: event.network,
      sessionId,
      player: this.readStringField(event.payload, 'player'),
      dayId: Number(event.payload.dayId ?? 0),
      status: this.readStringField(event.payload, 'status', 'Finalized'),
      attemptsUsed: Number(event.payload.attemptsUsed ?? 0),
      finalized: true,
      schemaVersion: CURRENT_PROJECTION_VERSION,
    });

    await this.sessionsRepo.save(projection);
    return true;
  }

  private readStringField(
    payload: Record<string, unknown>,
    key: string,
    fallback = '',
  ): string {
    const value = payload[key];
    return typeof value === 'string' ? value : fallback;
  }
}
