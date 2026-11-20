import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Registry,
  Histogram,
  Counter,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  readonly httpRequestDuration: Histogram;
  readonly httpRequestCounter: Counter;
  readonly errorRateCounter: Counter;
  readonly dbQueryDuration: Histogram;
  readonly eventNormalizationFailures: Counter;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.errorRateCounter = new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP error responses (4xx and 5xx)',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.eventNormalizationFailures = new Counter({
      name: 'dewordle_event_normalization_failures_total',
      help: 'Total number of malformed Soroban events rejected during normalization',
      labelNames: ['event_type', 'error_reason'],
      registers: [this.registry],
    });
  }

  recordEventNormalizationFailure(
    eventType: string,
    errorReason: 'schema_validation' | 'missing_topic',
  ): void {
    this.eventNormalizationFailures.inc({
      event_type: eventType,
      error_reason: errorReason,
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getMetricsAsJson(): Promise<unknown> {
    return this.registry.getMetricsAsJSON();
  }
}
