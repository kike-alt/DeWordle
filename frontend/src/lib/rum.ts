/**
 * PERF-101: Real User Monitoring (RUM) for production performance tracking.
 *
 * Collects Core Web Vitals (LCP, CLS, FID/INP, TTFB, FCP) and reports them
 * to the configured analytics endpoint or a custom collector.
 *
 * Usage in app/layout.tsx:
 *   import { initRUM } from '@/lib/rum';
 *   if (typeof window !== 'undefined') initRUM();
 */

export interface RUMMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
}

const ENDPOINT = process.env.NEXT_PUBLIC_RUM_ENDPOINT;
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown';

function sendMetric(metric: RUMMetric): void {
  const payload = {
    ...metric,
    appVersion: APP_VERSION,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };

  // Use sendBeacon for reliable delivery on page unload
  if (ENDPOINT && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon(ENDPOINT, blob);
  } else if (ENDPOINT) {
    fetch(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // RUM failures must never surface to users
    });
  }

  // Always log to console in dev for local inspection
  if (process.env.NODE_ENV === 'development') {
    console.info(`[RUM] ${metric.name}: ${metric.value.toFixed(1)} ms (${metric.rating})`);
  }
}

export async function initRUM(): Promise<void> {
  try {
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');

    onLCP(sendMetric);
    onCLS(sendMetric);
    onINP(sendMetric);
    onFCP(sendMetric);
    onTTFB(sendMetric);
  } catch {
    // web-vitals not installed — degrade silently
  }
}