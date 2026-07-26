/**
 * PERF-105: Distributed tracing with OpenTelemetry.
 *
 * This file bootstraps OpenTelemetry tracing using the packages listed below.
 * Install them before enabling tracing:
 *
 *   npm install --prefix backend \
 *     @opentelemetry/sdk-node \
 *     @opentelemetry/auto-instrumentations-node \
 *     @opentelemetry/exporter-trace-otlp-http \
 *     @opentelemetry/resources \
 *     @opentelemetry/semantic-conventions \
 *     @opentelemetry/sdk-trace-base
 *
 * Call initTracing() at the very top of main.ts (before any other imports)
 * to ensure auto-instrumentation patches load first.
 */

const isTracingEnabled =
  process.env.OTEL_ENABLED === 'true' || process.env.NODE_ENV === 'production';

export function initTracing(): void {
  if (!isTracingEnabled) return;

  // Dynamic require so missing packages don't break compilation
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resource } = require('@opentelemetry/resources');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    headers: process.env.OTEL_EXPORTER_HEADERS
      ? JSON.parse(process.env.OTEL_EXPORTER_HEADERS)
      : {},
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'dewordle-backend',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.0',
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    }),
    spanProcessor: new BatchSpanProcessor(exporter, {
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  process.on('SIGTERM', async () => { await sdk.shutdown(); });
}

export function getTracer(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name, process.env.npm_package_version);
}