/**
 * PERF-108: Production monitoring and alerting with Prometheus and Grafana.
 *
 * Install: npm install prom-client
 * Exposes /metrics endpoint for Prometheus scraping.
 *
 * Add to AppModule:
 *   PrometheusModule (registers /metrics endpoint via NestJS)
 * Or use raw prom-client for custom metrics alongside @willsoto/nestjs-prometheus.
 */
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export const registry = new Registry();

// Collect default Node.js process metrics (CPU, memory, GC)
collectDefaultMetrics({ register: registry, prefix: 'dewordle_' });

// ── Custom Metrics ──────────────────────────────────────────────────────────

/** Total HTTP requests by method, route, and status */
export const httpRequestsTotal = new Counter({
  name: 'dewordle_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

/** HTTP request duration histogram */
export const httpRequestDuration = new Histogram({
  name: 'dewordle_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

/** Active game sessions */
export const activeGameSessions = new Gauge({
  name: 'dewordle_active_game_sessions',
  help: 'Number of currently active game sessions',
  registers: [registry],
});

/** Total guesses submitted */
export const guessesTotal = new Counter({
  name: 'dewordle_guesses_total',
  help: 'Total number of word guesses submitted',
  labelNames: ['result'], // 'correct' | 'incorrect'
  registers: [registry],
});

/** Failed authentication attempts */
export const authFailuresTotal = new Counter({
  name: 'dewordle_auth_failures_total',
  help: 'Total number of failed authentication attempts',
  labelNames: ['reason'], // 'invalid_credentials' | 'token_expired' | 'rate_limited'
  registers: [registry],
});

/** DB connection pool utilisation */
export const dbPoolActive = new Gauge({
  name: 'dewordle_db_pool_active_connections',
  help: 'Number of active database connections in the pool',
  registers: [registry],
});