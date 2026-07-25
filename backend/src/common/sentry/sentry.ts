/**
 * DX-110: Error tracking with Sentry for dev and production.
 *
 * Install the required packages first:
 *   npm install --prefix backend @sentry/node @sentry/nestjs @sentry/profiling-node
 *
 * Then call initSentry() at the very top of main.ts before NestFactory.
 */

export interface SentryConfig {
  dsn?: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  sendDefaultPii: boolean;
}

export function buildSentryConfig(): SentryConfig {
  return {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    sendDefaultPii: false,
  };
}

export function initSentry(): void {
  const config = buildSentryConfig();

  if (!config.dsn) {
    console.warn('[Sentry] SENTRY_DSN not set — error tracking disabled');
    return;
  }

  try {
    // Dynamic require so missing packages don't break compilation
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');

    Sentry.init({
      ...config,
      integrations: [nodeProfilingIntegration()],
      beforeSend(event: Record<string, unknown>) {
        const req = event.request as Record<string, unknown> | undefined;
        if (typeof req?.url === 'string' && req.url.endsWith('/health')) return null;
        return event;
      },
    });

    console.info(`[Sentry] Initialised for environment: ${config.environment}`);
  } catch {
    console.warn('[Sentry] @sentry/node not installed — skipping initialisation');
  }
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node');
    Sentry.withScope((scope: { setExtras: (ctx: Record<string, unknown>) => void }) => {
      if (context) scope.setExtras(context);
      Sentry.captureException(error);
    });
  } catch {
    console.error('[Sentry] captureError failed:', error.message);
  }
}