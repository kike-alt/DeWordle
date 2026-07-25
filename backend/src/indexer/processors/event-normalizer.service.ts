import { Injectable } from '@nestjs/common';
import { IngestedEventDto } from '../dto/ingested-event.dto';

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
  'achievement_unlocked',
]);

/** Default max payload byte size; override via INDEXER_MAX_PAYLOAD_BYTES env var. */
export const DEFAULT_MAX_PAYLOAD_BYTES = 8_192;

@Injectable()
export class EventNormalizerService {
  private readonly maxPayloadBytes: number;

  constructor() {
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
    if (!event.contractId || !event.topic || !event.txHash) return false;
    if (!Number.isInteger(event.ledger) || event.ledger <= 0) return false;
    if (!Number.isInteger(event.eventIndex) || event.eventIndex < 0)
      return false;
    if (!ALLOWED_TOPICS.has(event.topic)) return false;
    if (this.payloadBytes(event.payload) > this.maxPayloadBytes) return false;
    return true;
  }

  private payloadBytes(payload: Record<string, unknown>): number {
    try {
      return Buffer.byteLength(JSON.stringify(payload), 'utf8');
    } catch {
      return Infinity;
    }
  }
}
