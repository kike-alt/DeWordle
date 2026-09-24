import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

const EXCLUDED_ROUTES = new Set(['/health', '/metrics']);

@Injectable()
export class PrometheusMetricsService {
  readonly registry = new Registry();

  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  readonly httpStatusCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  record(method: string, route: string, statusCode: number, durationSeconds: number): void {
    if (EXCLUDED_ROUTES.has(route)) return;
    const labels = { method, route, status_code: String(statusCode) };
    this.httpDuration.observe(labels, durationSeconds);
    this.httpStatusCounter.inc(labels);
  }

  async metricsText(): Promise<string> {
    return this.registry.metrics();
  }
}
