import { Injectable, Logger } from '@nestjs/common';
import { IngestedEventDto } from '../dto/ingested-event.dto';
import { compareEventsByCursor } from '../processors/event-ordering.util';
import { INDEXER_QUEUE_MAX_BUFFER_SIZE } from './indexer-queue.constants';

@Injectable()
export class IndexerQueueService {
  private readonly logger = new Logger(IndexerQueueService.name);
  private readonly buffer: IngestedEventDto[] = [];

  enqueue(event: IngestedEventDto) {
    if (this.buffer.length >= INDEXER_QUEUE_MAX_BUFFER_SIZE) {
      this.logger.warn({
        msg: 'indexer.queue.rejected',
        reason: 'buffer_limit_reached',
        bufferSize: this.buffer.length,
        bufferLimit: INDEXER_QUEUE_MAX_BUFFER_SIZE,
        ledger: event.ledger,
        txHash: event.txHash,
        eventIndex: event.eventIndex,
      });
      return false;
    }

    this.buffer.push(event);
    this.buffer.sort(compareEventsByCursor);

    this.logger.debug(
      `Queued event ${event.topic} at ${event.txHash}#${event.eventIndex}`,
    );
    return true;
  }

  drain(): IngestedEventDto[] {
    const queued = [...this.buffer];
    this.buffer.length = 0;
    return queued;
  }

  size() {
    return this.buffer.length;
  }
}
