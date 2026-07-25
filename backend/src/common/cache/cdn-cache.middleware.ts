import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * PERF-103: Middleware that sets CDN-friendly cache headers.
 * Differentiates between public static/game data and private user-specific responses.
 */
@Injectable()
export class CdnCacheMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Private routes — no CDN caching
    const privateRoutes = ['/auth', '/users/me', '/game/session', '/wallet'];
    const isPrivate = privateRoutes.some((r) => req.path.startsWith(r));

    if (isPrivate || req.method !== 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }

    // Public game-data routes — cache at edge for 60 s, stale-while-revalidate 300 s
    const publicRoutes = ['/words', '/leaderboard', '/stats'];
    const isPublic = publicRoutes.some((r) => req.path.startsWith(r));

    if (isPublic) {
      res.setHeader(
        'Cache-Control',
        'public, max-age=60, stale-while-revalidate=300, stale-if-error=86400',
      );
      res.setHeader('Vary', 'Accept-Encoding');
      return next();
    }

    // Default: short private cache
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    next();
  }
}