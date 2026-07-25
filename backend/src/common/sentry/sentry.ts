/**
 * DX-110: Error tracking with Sentry for dev and production.
 *
 * Install:
 *   npm install @sentry/node @sentry/nestjs @sentry/profiling-node
 *
 * Usage: call initSentry() before creating the NestJS app in main.ts.
 * Then wrap the app with Sentry.setupNestErrorHandler(app).
 */
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] SENTRY_DSN not set — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Performance tracing — sample 10% in production, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling — sample 10% of traced transactions
    profilesSampleRate: 0.1,
    // Do not capture PII
    sendDefaultPii: false,
    // Filter out health-check noise
    beforeSend(event) {
      if (event.request?.url?.endsWith('/health')) return null;
      return event;
    },
  });

  console.info(`[Sentry] Initialised for environment: ${process.env.NODE_ENV}`);
}

/**
 * Capture an exception with optional context.
 * Use this instead of console.error for caught errors that should be tracked.
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}