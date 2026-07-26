import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

/**
 * PERF-107: Server-side rendering optimization for critical pages.
 * In-memory SSR response cache with TTL to avoid redundant re-renders
 * for public, non-personalised pages (home, leaderboard, word-of-the-day).
 */

interface CacheEntry {
  body: string;
  headers: Record<string, string | string[]>;
  status: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000; // 60 seconds

@Injectable()
export class SsrCacheMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (req.method !== 'GET') return next();
    const cacheable = ['/leaderboard', '/about'].some((p) => req.path.startsWith(p));
    if (!cacheable) return next();

    const key = createHash('sha256').update(req.url).digest('hex');
    const entry = cache.get(key);

    if (entry && entry.expiresAt > Date.now()) {
      res.set(entry.headers as Record<string, string>);
      res.set('X-Cache', 'HIT');
      res.status(entry.status).send(entry.body);
      return;
    }

    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).write = function (chunk: any, encoding?: any, callback?: any): boolean {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalWrite as any)(chunk, encoding, callback);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).end = function (chunk?: any, encoding?: any, callback?: any): Response {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      }
      if (res.statusCode < 400) {
        const headers: Record<string, string | string[]> = {};
        ['content-type', 'cache-control', 'vary'].forEach((h) => {
          const v = res.getHeader(h);
          if (v) headers[h] = v as string | string[];
        });
        cache.set(key, {
          body: Buffer.concat(chunks).toString(),
          headers,
          status: res.statusCode,
          expiresAt: Date.now() + DEFAULT_TTL_MS,
        });
      }
      res.set('X-Cache', 'MISS');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalEnd as any)(chunk, encoding, callback);
    };

    next();
  }
}