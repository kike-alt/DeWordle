import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IndexerService } from '../indexer.service';
import {
  INDEXER_NETWORK_TESTNET,
  INDEXER_STREAM_CORE_GAME,
} from '../indexer.constants';
import { CursorService } from '../projections/cursor.service';
import { ReplayAlertService } from './replay-alert.service';

@Injectable()
export class IndexerWorkerService {
  private readonly logger = new Logger(IndexerWorkerService.name);

  constructor(
    private readonly indexerService: IndexerService,
    private readonly cursorService: CursorService,
    private readonly configService: ConfigService,
    private readonly replayAlertService: ReplayAlertService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async tick() {
    const correlationId = randomUUID();
    const network =
      this.configService.get<string>('SOROBAN_NETWORK') ||
      INDEXER_NETWORK_TESTNET;
    const cursor = await this.cursorService.getOrCreate(
      network,
      INDEXER_STREAM_CORE_GAME,
    );
    const replayAlert = this.replayAlertService.snapshot();

    this.logger.log({
      msg: 'indexer.worker.tick',
      correlationId,
      network,
      cursorLedger: cursor.lastLedger,
      cursorTxHash: cursor.lastTxHash,
      cursorEventIndex: cursor.lastEventIndex,
      metrics: { ...this.indexerService.metrics },
      replayAlert,
      replayAlertTag: replayAlert.alertTag,
    });

    await this.indexerService.poll({ correlationId });
  }
}
