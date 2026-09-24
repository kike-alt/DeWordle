import { Injectable, Logger } from '@nestjs/common';
import { rpc } from '@stellar/stellar-sdk';

const EVENT_TOPICS = ['game_start', 'guess_sub', 'game_win'];

@Injectable()
export class ContractEventListenerService {
  private readonly logger = new Logger(ContractEventListenerService.name);
  private lastLedger = 0;

  constructor(private readonly server: rpc.Server) {}

  async pollOnce(contractId: string): Promise<void> {
    const events = await this.server.getEvents({
      startLedger: this.lastLedger + 1,
      filters: [{ type: 'contract', contractIds: [contractId], topics: [EVENT_TOPICS] }],
    });

    for (const event of events.events) {
      this.logger.log(`event at ledger ${event.ledger}: ${event.topic}`);
      this.lastLedger = Math.max(this.lastLedger, event.ledger);
    }
  }
}
