/**
 * PERF-101: Real User Monitoring (RUM) using native PerformanceObserver.
 * Collects Core Web Vitals (LCP, CLS, FID, FCP, TTFB) and reports via sendBeacon.
 *
 * No external dependencies — uses the browser's built-in Performance APIs.
 * Usage: call initRUM() once in your root layout or _app.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_RUM_ENDPOINT ?? '/api/rum';

function send(name: string, value: number): void {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  const body = JSON.stringify({
    name,
    value,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });
  navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
}

export function initRUM(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  // Largest Contentful Paint
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (last) send('LCP', last.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* unsupported */ }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!e.hadRecentInput) clsValue += e.value;
      }
      send('CLS', clsValue);
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* unsupported */ }

  // First Input Delay
  try {
    new PerformanceObserver((list) => {
      const entry = list.getEntries()[0] as PerformanceEntry & {
        processingStart: number;
        startTime: number;
      };
      if (entry) send('FID', entry.processingStart - entry.startTime);
    }).observe({ type: 'first-input', buffered: true });
  } catch { /* unsupported */ }

  // First Contentful Paint
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          send('FCP', entry.startTime);
        }
      }
    }).observe({ type: 'paint', buffered: true });
  } catch { /* unsupported */ }

  // Time to First Byte
  try {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (nav) send('TTFB', nav.responseStart - nav.requestStart);
  } catch { /* unsupported */ }
}