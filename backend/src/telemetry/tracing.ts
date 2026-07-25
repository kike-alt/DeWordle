/**
 * PERF-105: Distributed tracing with OpenTelemetry.
 * Import this file FIRST in main.ts before any other imports to ensure
 * auto-instrumentation patches are applied at startup.
 *
 * Required packages:
 *   @opentelemetry/sdk-node
 *   @opentelemetry/auto-instrumentations-node
 *   @opentelemetry/exporter-trace-otlp-http
 *   @opentelemetry/resources
 *   @opentelemetry/semantic-conventions
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

const isTracingEnabled =
  process.env.OTEL_ENABLED === 'true' || process.env.NODE_ENV === 'production';

let sdk: NodeSDK | null = null;

export function initTracing(): void {
  if (!isTracingEnabled) return;

  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    headers: process.env.OTEL_EXPORTER_HEADERS
      ? JSON.parse(process.env.OTEL_EXPORTER_HEADERS)
      : {},
  });

  sdk = new NodeSDK({
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
        // Disable noisy fs instrumentation
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', async () => {
    await sdk?.shutdown();
  });
}

export function getTracer(name: string) {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name, process.env.npm_package_version);
}