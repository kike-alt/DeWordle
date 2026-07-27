import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IngestedEventDto } from './dto/ingested-event.dto';
import { EventProcessorService } from './processors/event-processor.service';
import { EventNormalizerService } from './processors/event-normalizer.service';
import { CursorService } from './projections/cursor.service';
import { compareEventsByCursor } from './processors/event-ordering.util';
import {
  validateRpcResponseShape,
  diagnoseMalformedEvent,
} from './processors/rpc-response.validator';
import { randomUUID } from 'crypto';
import { INDEXER_STREAM_CORE_GAME } from './indexer.constants';
import { ReplayAlertService } from './queue/replay-alert.service';
import { sanitizeErrorMessage } from '../common/redaction';

export interface IndexerLogContext {
  correlationId: string;
}

/** Observability counters for indexer health metrics. */
export interface IndexerMetrics {
  ingestedTotal: number;
  replaySkips: number;
  projectionErrors: number;
  pollCycles: number;
  lastCursorLedger: number;
  lastTickAt: Date | null;
}

export interface IndexerLagSnapshot {
  network: string;
  streamKey: string;
  cursor: {
    lastLedger: number;
    lastTxHash: string;
    lastEventIndex: number;
    updatedAt?: Date;
  };
  lastProcessedTxHash: string;
  networkLatestLedger: number | null;
  lagLedgers: number | null;
  replaySkips: number;
  ingestedTotal: number;
  projectionErrors: number;
  pollCycles: number;
}

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  readonly metrics: IndexerMetrics = {
    ingestedTotal: 0,
    replaySkips: 0,
    projectionErrors: 0,
    pollCycles: 0,
    lastCursorLedger: 0,
    lastTickAt: null,
  };

  constructor(
    private readonly eventProcessor: EventProcessorService,
    private readonly eventNormalizer: EventNormalizerService,
    private readonly cursorService: CursorService,
    private readonly configService: ConfigService,
    private readonly replayAlertService: ReplayAlertService,
  ) {}

  async ingest(event: IngestedEventDto, context?: IndexerLogContext) {
    const t0 = Date.now();
    try {
      await this.eventProcessor.process(event, context);
      await this.cursorService.checkpoint(
        event.network,
        INDEXER_STREAM_CORE_GAME,
        event.ledger,
        event.txHash,
        event.eventIndex,
      );
      this.metrics.ingestedTotal++;
      this.metrics.lastCursorLedger = event.ledger;
      this.logger.log({
        msg: 'indexer.ingest.ok',
        correlationId: context?.correlationId,
        topic: event.topic,
        ledger: event.ledger,
        txHash: event.txHash,
        eventIndex: event.eventIndex,
        latencyMs: Date.now() - t0,
      });
    } catch (err) {
      this.metrics.projectionErrors++;
      this.logger.error({
        msg: 'indexer.ingest.error',
        correlationId: context?.correlationId,
        topic: event.topic,
        ledger: event.ledger,
        error: sanitizeErrorMessage(err),
      });
      throw err;
    }
  }

  async getLagSnapshot(): Promise<IndexerLagSnapshot> {
    const network =
      (this.configService.get<string>('SOROBAN_NETWORK') as
        | 'testnet'
        | 'mainnet') || 'testnet';
    const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL');
    const cursor = await this.cursorService.getOrCreate(
      network,
      INDEXER_STREAM_CORE_GAME,
    );

    let networkLatestLedger: number | null = null;
    if (rpcUrl) {
      networkLatestLedger = await this.fetchLatestLedger(rpcUrl);
    }

    return {
      network,
      streamKey: INDEXER_STREAM_CORE_GAME,
      cursor: {
        lastLedger: cursor.lastLedger,
        lastTxHash: cursor.lastTxHash,
        lastEventIndex: cursor.lastEventIndex,
        updatedAt: cursor.updatedAt,
      },
      lastProcessedTxHash: cursor.lastTxHash,
      networkLatestLedger,
      lagLedgers:
        networkLatestLedger === null
          ? null
          : Math.max(networkLatestLedger - cursor.lastLedger, 0),
      replaySkips: this.metrics.replaySkips,
      ingestedTotal: this.metrics.ingestedTotal,
      projectionErrors: this.metrics.projectionErrors,
      pollCycles: this.metrics.pollCycles,
    };
  }

  getHealthcheck(): {
    status: 'alive' | 'stale' | 'down';
    queueDepth: number;
    queueMaxSize: number;
    secondsSinceLastTick: number;
    lastTickAt: string | null;
    ingestedTotal: number;
    projectionErrors: number;
  } {
    const now = Date.now();
    const lastTick = this.metrics.lastTickAt?.getTime() ?? 0;
    const secondsSinceLastTick =
      lastTick === 0 ? Infinity : Math.floor((now - lastTick) / 1000);

    let status: 'alive' | 'stale' | 'down' = 'alive';
    if (secondsSinceLastTick > 60) status = 'down';
    else if (secondsSinceLastTick > 30) status = 'stale';

    if (this.metrics.pollCycles === 0) status = 'down';

    return {
      status,
      queueDepth: 0,
      queueMaxSize: 0,
      secondsSinceLastTick,
      lastTickAt: this.metrics.lastTickAt?.toISOString() ?? null,
      ingestedTotal: this.metrics.ingestedTotal,
      projectionErrors: this.metrics.projectionErrors,
    };
  }

  async poll(context?: IndexerLogContext): Promise<number> {
    const network =
      (this.configService.get<string>('SOROBAN_NETWORK') as
        | 'testnet'
        | 'mainnet') || 'testnet';
    const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL');
    const contractId = this.configService.get<string>(
      'SOROBAN_CORE_GAME_CONTRACT_ID',
    );

    const cycleContext: IndexerLogContext = context ?? {
      correlationId: randomUUID(),
    };

    if (!rpcUrl || !contractId) {
      this.logger.warn({
        msg: 'indexer.poll.skipped',
        correlationId: cycleContext.correlationId,
        reason: 'missing_config',
      });
      return 0;
    }

    const cursor = await this.cursorService.getOrCreate(
      network,
      INDEXER_STREAM_CORE_GAME,
    );
    this.metrics.pollCycles++;
    this.metrics.lastCursorLedger = cursor.lastLedger;
    this.metrics.lastTickAt = new Date();

    this.logger.log({
      msg: 'indexer.poll.tick',
      correlationId: cycleContext.correlationId,
      network,
      cursorLedger: cursor.lastLedger,
      cursorTxHash: cursor.lastTxHash,
      cursorEventIndex: cursor.lastEventIndex,
      metrics: { ...this.metrics },
    });
    this.logger.debug({
      msg: 'indexer.poll.debug',
      correlationId: cycleContext.correlationId,
      network,
      cursorLedger: cursor.lastLedger,
      cursorTxHash: cursor.lastTxHash,
      cursorEventIndex: cursor.lastEventIndex,
    });

    const rawEvents = await this.fetchEvents(
      rpcUrl,
      contractId,
      cursor.lastLedger,
    );

    const structurallyValidEvents = rawEvents.filter((raw, idx) => {
      const diagnostic = diagnoseMalformedEvent(raw, idx);
      if (diagnostic) {
        this.logger.warn({
          msg: 'indexer.rpc.malformed_event',
          correlationId: cycleContext.correlationId,
          ...diagnostic,
        });
        return false;
      }
      return true;
    });

    const normalized = structurallyValidEvents
      .map((raw) => this.eventNormalizer.normalize(network, raw))
      .filter((e) => this.eventNormalizer.isValid(e))
      .sort(compareEventsByCursor);

    let ingested = 0;
    for (const event of normalized) {
      await this.ingest(event, cycleContext);
      ingested++;
    }

    this.logger.log({
      msg: 'indexer.poll.complete',
      correlationId: cycleContext.correlationId,
      ingested,
    });
    return ingested;
  }

  /** Fetches raw Soroban events from RPC after the given ledger cursor. Overridable for testing. */
  async fetchEvents(
    rpcUrl: string,
    contractId: string,
    afterLedger: number,
  ): Promise<Record<string, unknown>[]> {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getEvents',
      params: {
        startLedger: afterLedger > 0 ? afterLedger + 1 : 1,
        filters: [{ type: 'contract', contractIds: [contractId] }],
        pagination: { limit: 200 },
      },
    };

    const response = await axios.post<unknown>(rpcUrl, body, {
      timeout: 10_000,
    });

    return validateRpcResponseShape(response.data);
  }

  async fetchLatestLedger(rpcUrl: string): Promise<number> {
    const response = await axios.post<{
      result?: { latestLedger?: number };
    }>(
      rpcUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      },
      { timeout: 10_000 },
    );

    return response.data?.result?.latestLedger ?? 0;
  }

  /** Resets the indexer cursor for a given network/stream to genesis. */
  async resetCursor(network: string, streamKey: string): Promise<void> {
    await this.cursorService.reset(network, streamKey);
    this.metrics.lastCursorLedger = 0;
    this.metrics.ingestedTotal = 0;
    this.metrics.replaySkips = 0;
    this.metrics.projectionErrors = 0;
    this.metrics.lastTickAt = null;
    this.logger.warn({
      msg: 'indexer.cursor.reset',
      network,
      streamKey,
    });
  }

  /** Clears all projection data from the database. */
  async resetProjections(): Promise<void> {
    await this.cursorService.resetProjections();
    this.metrics.projectionErrors = 0;
    this.logger.warn({
      msg: 'indexer.projections.reset',
    });
  }

  recordReplaySkip(
    ledger: number,
    txHash: string,
    eventIndex: number,
    context?: IndexerLogContext,
  ) {
    this.metrics.replaySkips++;
    const alert = this.replayAlertService.recordReplayRejection(
      ledger,
      txHash,
      eventIndex,
    );
    this.logger.warn({
      msg: 'indexer.replay.skip',
      correlationId: context?.correlationId,
      ledger,
      txHash,
      eventIndex,
      totalSkips: this.metrics.replaySkips,
      replayAlert: alert.isAlerting ? 'threshold_exceeded' : 'below_threshold',
    });
  }
}
