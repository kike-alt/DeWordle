export const DAY_PUBLISHED_EVENT = 'day.published';

export class DayPublishedEvent {
  constructor(
    readonly dayId: string | number,
    readonly timestamp: string,
    readonly commitmentHash: string,
    readonly maxAttempts: number,
  ) {}
}
