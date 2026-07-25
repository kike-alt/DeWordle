import { IngestedEventDto } from '../dto/ingested-event.dto';

export function compareEventsByCursor(
  a: IngestedEventDto,
  b: IngestedEventDto,
): number {
  if (a.ledger !== b.ledger) {
    return a.ledger - b.ledger;
  }
  if (a.txHash !== b.txHash) {
    return a.txHash.localeCompare(b.txHash);
  }
  return a.eventIndex - b.eventIndex;
}
