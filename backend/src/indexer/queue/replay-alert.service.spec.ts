import { ReplayAlertService } from './replay-alert.service';

describe('ReplayAlertService', () => {
  let service: ReplayAlertService;

  beforeEach(() => {
    service = new ReplayAlertService();
  });

  it('tracks replay rejections and flips to alerting after the threshold', () => {
    for (let i = 0; i < 4; i += 1) {
      const snapshot = service.recordReplayRejection(100 + i, `tx-${i}`, i);
      expect(snapshot.isAlerting).toBe(false);
      expect(snapshot.windowSkips).toBe(i + 1);
    }

    const thresholdSnapshot = service.recordReplayRejection(200, 'tx-alert', 0);

    expect(thresholdSnapshot.windowSkips).toBe(5);
    expect(thresholdSnapshot.threshold).toBe(5);
    expect(thresholdSnapshot.isAlerting).toBe(true);
    expect(thresholdSnapshot.lastRejectedAt).toBeInstanceOf(Date);
  });

  it('resetWindow clears alert state', () => {
    service.recordReplayRejection(1, 'tx-a', 0);
    service.resetWindow();

    const snapshot = service.snapshot();
    expect(snapshot.windowSkips).toBe(0);
    expect(snapshot.isAlerting).toBe(false);
    expect(snapshot.lastRejectedAt).toBeUndefined();
  });
});
