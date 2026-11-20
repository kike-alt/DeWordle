import { DayPublishedWebhookService } from './day-published-webhook.service';
import { DayPublishedEvent } from './day-published.event';
import { createHmac } from 'crypto';

describe('DayPublishedWebhookService', () => {
  const secret = 'test-secret';
  const endpoint = 'https://hooks.example.test/daily';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeService(urls = endpoint, signingSecret = secret) {
    return new DayPublishedWebhookService({
      get: (key: string) =>
        key === 'DAY_PUBLISHED_WEBHOOK_URLS' ? urls : signingSecret,
    } as never);
  }

  it('sends the event payload with an HMAC-SHA256 signature', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const service = makeService();
    const event = new DayPublishedEvent(
      42,
      '2026-11-19T00:00:00.000Z',
      'commitment-hash',
      6,
    );

    await service.dispatch(event);

    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.stringify({
      dayId: 42,
      timestamp: '2026-11-19T00:00:00.000Z',
      commitmentHash: 'commitment-hash',
      maxAttempts: 6,
    });
    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    expect(url).toBe(endpoint);
    expect(options?.body).toBe(body);
    expect(options?.headers).toMatchObject({
      'X-DeWordle-Signature': `sha256=${expectedSignature}`,
    });
  });

  it('retries failed deliveries up to three total attempts', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('network error'));
    const service = makeService();
    const pending = service.dispatch(
      new DayPublishedEvent(1, new Date().toISOString(), 'hash', 6),
    );

    await jest.advanceTimersByTimeAsync(750);
    await pending;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it('requires a signing secret when webhook endpoints are configured', () => {
    expect(() => makeService(endpoint, '')).toThrow(
      'DAY_PUBLISHED_WEBHOOK_SECRET is required',
    );
  });
});
