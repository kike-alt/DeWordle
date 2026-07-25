import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IndexerCursorEntity } from '../entities/indexer-cursor.entity';

@Injectable()
export class CursorService {
  private readonly logger = new Logger(CursorService.name);

  constructor(
    @InjectRepository(IndexerCursorEntity)
    private readonly cursorRepo: Repository<IndexerCursorEntity>,
  ) {}

  async getOrCreate(
    network: string,
    streamKey: string,
  ): Promise<IndexerCursorEntity> {
    const existing = await this.cursorRepo.findOne({
      where: { network, streamKey },
    });
    if (existing) return existing;

    return this.cursorRepo.save(
      this.cursorRepo.create({
        network,
        streamKey,
        lastLedger: 0,
        lastTxHash: '',
        lastEventIndex: 0,
      }),
    );
  }

  /**
   * Advances the cursor only when the new position is strictly monotonically
   * greater than the current one (ledger → txHash → eventIndex).
   * Regression attempts are logged and silently dropped.
   */
  async checkpoint(
    network: string,
    streamKey: string,
    lastLedger: number,
    lastTxHash: string,
    lastEventIndex: number,
  ): Promise<boolean> {
    const cursor = await this.getOrCreate(network, streamKey);

    if (
      !this.isMonotonicallyGreater(
        cursor,
        lastLedger,
        lastTxHash,
        lastEventIndex,
      )
    ) {
      this.logger.warn(
        `Cursor regression rejected for ${network}/${streamKey}: ` +
          `current=${cursor.lastLedger}:${cursor.lastTxHash}:${cursor.lastEventIndex} ` +
          `attempted=${lastLedger}:${lastTxHash}:${lastEventIndex}`,
      );
      return false;
    }

    cursor.lastLedger = lastLedger;
    cursor.lastTxHash = lastTxHash;
    cursor.lastEventIndex = lastEventIndex;
    await this.cursorRepo.save(cursor);
    return true;
  }

  /** Resets the cursor for a given network/stream to genesis state. */
  async reset(network: string, streamKey: string): Promise<void> {
    const cursor = await this.getOrCreate(network, streamKey);
    cursor.lastLedger = 0;
    cursor.lastTxHash = '';
    cursor.lastEventIndex = 0;
    await this.cursorRepo.save(cursor);
  }

  /** Deletes all session projection records. */
  async resetProjections(): Promise<void> {
    await this.cursorRepo.manager.query('DELETE FROM session_projections');
  }

  private isMonotonicallyGreater(
    cursor: IndexerCursorEntity,
    ledger: number,
    txHash: string,
    eventIndex: number,
  ): boolean {
    if (ledger > cursor.lastLedger) return true;
    if (ledger < cursor.lastLedger) return false;
    // same ledger — compare txHash lexicographically
    const txCmp = txHash.localeCompare(cursor.lastTxHash);
    if (txCmp > 0) return true;
    if (txCmp < 0) return false;
    // same ledger + txHash — compare eventIndex
    return eventIndex > cursor.lastEventIndex;
  }
}
