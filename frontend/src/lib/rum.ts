/**
 * PERF-101: Real User Monitoring (RUM) using web-vitals.
 * Collects Core Web Vitals and reports them via sendBeacon.
 *
 * Install: npm install web-vitals
 * Usage: import { initRUM } from '@/lib/rum'; initRUM();
 */

type MetricReport = {
  name: string;
  value: number;
  rating: string;
  delta: number;
  id: string;
};

const ENDPOINT = process.env.NEXT_PUBLIC_RUM_ENDPOINT ?? '/api/rum';

function sendToAnalytics(metric: MetricReport): void {
  if (!navigator.sendBeacon) return;
  const body = JSON.stringify({
    ...metric,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });
  navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
}

export function initRUM(): void {
  if (typeof window === 'undefined') return;
  // Dynamic import to avoid compile-time errors when web-vitals is not installed
  import('web-vitals')
    .then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS((m) => sendToAnalytics(m as unknown as MetricReport));
      onFID((m) => sendToAnalytics(m as unknown as MetricReport));
      onFCP((m) => sendToAnalytics(m as unknown as MetricReport));
      onLCP((m) => sendToAnalytics(m as unknown as MetricReport));
      onTTFB((m) => sendToAnalytics(m as unknown as MetricReport));
    })
    .catch(() => {
      // web-vitals not installed — RUM disabled
    });
}