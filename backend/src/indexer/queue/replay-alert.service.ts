import { Injectable, Logger } from '@nestjs/common';
import { REPLAY_REJECTION_ALERT_THRESHOLD } from './replay-alert.constants';

export interface ReplayAlertSnapshot {
  windowSkips: number;
  threshold: number;
  isAlerting: boolean;
  lastRejectedAt?: Date;
  alertTag: string;
}

@Injectable()
export class ReplayAlertService {
  private readonly logger = new Logger(ReplayAlertService.name);
  private windowSkips = 0;
  private lastRejectedAt?: Date;
  private readonly threshold = REPLAY_REJECTION_ALERT_THRESHOLD;

  recordReplayRejection(
    ledger: number,
    txHash: string,
    eventIndex: number,
  ): ReplayAlertSnapshot {
    this.windowSkips += 1;
    this.lastRejectedAt = new Date();

    const snapshot = this.snapshot();
    this.logger.warn({
      msg: 'indexer.replay.rejected',
      ledger,
      txHash,
      eventIndex,
      windowSkips: snapshot.windowSkips,
      threshold: snapshot.threshold,
      alert: snapshot.alertTag,
    });

    return snapshot;
  }

  snapshot(): ReplayAlertSnapshot {
    const isAlerting = this.windowSkips >= this.threshold;
    return {
      windowSkips: this.windowSkips,
      threshold: this.threshold,
      isAlerting,
      lastRejectedAt: this.lastRejectedAt,
      alertTag: isAlerting
        ? 'replay_rejection_threshold_exceeded'
        : 'replay_rejection_observed',
    };
  }

  resetWindow(): void {
    this.windowSkips = 0;
    this.lastRejectedAt = undefined;
  }
}
