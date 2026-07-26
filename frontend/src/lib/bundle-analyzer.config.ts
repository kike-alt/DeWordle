/**
 * PERF-106: Frontend bundle analysis and size optimization.
 * Utility wrapper — apply in next.config.ts to enable bundle analysis.
 *
 * Install: npm install @next/bundle-analyzer --save-dev
 * Run:     ANALYZE=true npm run build
 */
import type { NextConfig } from 'next';

export function withBundleAnalyzer(config: NextConfig): NextConfig {
  if (process.env.ANALYZE !== 'true') return config;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const analyzer = require('@next/bundle-analyzer') as (
    opts: { enabled: boolean }
  ) => (c: NextConfig) => NextConfig;
  return analyzer({ enabled: true })(config);
}