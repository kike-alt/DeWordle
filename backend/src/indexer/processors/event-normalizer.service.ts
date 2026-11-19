import { Inject, Injectable, Optional } from '@nestjs/common';
import { IngestedEventDto } from '../dto/ingested-event.dto';
import { MetricsService } from '../../dewordle/metrics/metrics.service';

interface RawSorobanEvent {
  contractId?: string;
  topic?: string;
  txHash?: string;
  ledger?: number;
  eventIndex?: number;
  payload?: Record<string, unknown>;
}

/** Topics emitted by foundation contracts. Extend as new contract events are added. */
export const ALLOWED_TOPICS = new Set([
  'session_started',
  'guess_submitted',
  'session_finalized',
  'reward_claimed',
  // The rewards contract publishes this event under the topic `claimed`.
  'claimed',
  'achievement_unlocked',
]);

/** Default max payload byte size; override via INDEXER_MAX_PAYLOAD_BYTES env var. */
export const DEFAULT_MAX_PAYLOAD_BYTES = 8_192;

@Injectable()
export class EventNormalizerService {
  private readonly maxPayloadBytes: number;

  constructor(
    @Optional()
    @Inject(MetricsService)
    private readonly metricsService?: Pick<
      MetricsService,
      'recordEventNormalizationFailure'
    >,
  ) {
    const env = process.env.INDEXER_MAX_PAYLOAD_BYTES;
    this.maxPayloadBytes = env ? parseInt(env, 10) : DEFAULT_MAX_PAYLOAD_BYTES;
  }

  normalize(
    network: 'testnet' | 'mainnet',
    raw: RawSorobanEvent,
  ): IngestedEventDto {
    return {
      network,
      contractId: String(raw.contractId ?? ''),
      topic: String(raw.topic ?? '')
        .trim()
        .toLowerCase(),
      txHash: String(raw.txHash ?? ''),
      ledger: Number(raw.ledger ?? 0),
      eventIndex: Number(raw.eventIndex ?? 0),
      payload: raw.payload ?? {},
      observedAt: new Date(),
    };
  }

  isValid(event: IngestedEventDto): boolean {
    let errorReason: 'schema_validation' | 'missing_topic' | undefined;
    if (!event.topic) {
      errorReason = 'missing_topic';
    } else if (
      !event.contractId ||
      !event.txHash ||
      !Number.isInteger(event.ledger) ||
      event.ledger <= 0 ||
      !Number.isInteger(event.eventIndex) ||
      event.eventIndex < 0 ||
      !ALLOWED_TOPICS.has(event.topic) ||
      this.payloadBytes(event.payload) > this.maxPayloadBytes
    ) {
      errorReason = 'schema_validation';
    }

    if (errorReason) {
      this.recordFailure(event.topic || 'unknown', errorReason);
      return false;
    }

    return true;
  }

  recordFailure(
    eventType: string,
    errorReason: 'schema_validation' | 'missing_topic',
  ): void {
    this.metricsService?.recordEventNormalizationFailure(
      eventType,
      errorReason,
    );
  }

  private payloadBytes(payload: Record<string, unknown>): number {
    try {
      return Buffer.byteLength(JSON.stringify(payload), 'utf8');
    } catch {
      return Infinity;
    }
  }
}
