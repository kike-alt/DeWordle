import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { createHmac } from 'crypto';
import { DAY_PUBLISHED_EVENT, DayPublishedEvent } from './day-published.event';

const MAX_DELIVERY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 250;
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class DayPublishedWebhookService {
  private readonly logger = new Logger(DayPublishedWebhookService.name);
  private readonly webhookUrls: string[];
  private readonly signingSecret: string;

  constructor(config: ConfigService) {
    this.webhookUrls = (config.get<string>('DAY_PUBLISHED_WEBHOOK_URLS') ?? '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
    this.signingSecret =
      config.get<string>('DAY_PUBLISHED_WEBHOOK_SECRET') ?? '';

    for (const webhookUrl of this.webhookUrls) {
      const parsed = new URL(webhookUrl);
      if (parsed.protocol !== 'https:') {
        throw new Error(
          'DAY_PUBLISHED_WEBHOOK_URLS must contain HTTPS URLs only',
        );
      }
    }

    if (this.webhookUrls.length > 0 && !this.signingSecret) {
      throw new Error(
        'DAY_PUBLISHED_WEBHOOK_SECRET is required when webhook URLs are configured',
      );
    }
  }

  @OnEvent(DAY_PUBLISHED_EVENT)
  async dispatch(event: DayPublishedEvent): Promise<void> {
    if (this.webhookUrls.length === 0) return;

    const body = JSON.stringify({
      dayId: event.dayId,
      timestamp: event.timestamp,
      commitmentHash: event.commitmentHash,
      maxAttempts: event.maxAttempts,
    });
    const signature = createHmac('sha256', this.signingSecret)
      .update(body)
      .digest('hex');

    await Promise.all(
      this.webhookUrls.map((url) => this.deliver(url, body, signature)),
    );
  }

  private async deliver(
    url: string,
    body: string,
    signature: string,
  ): Promise<void> {
    for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-DeWordle-Signature': `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new Error(`Webhook responded with HTTP ${response.status}`);
        }
        return;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (attempt === MAX_DELIVERY_ATTEMPTS) {
          this.logger.error({
            msg: 'day-published.webhook.delivery_failed',
            url,
            attempt,
            reason,
          });
          return;
        }

        this.logger.warn({
          msg: 'day-published.webhook.retrying',
          url,
          attempt,
          reason,
        });
        await new Promise((resolve) =>
          setTimeout(resolve, INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1)),
        );
      }
    }
  }
}
