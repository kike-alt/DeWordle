import { Injectable, ExecutionContext } from '@nestjs/common';

/**
 * SEC-108: Authentication rate limiting and brute-force protection.
 *
 * Install @nestjs/throttler first:
 *   npm install --prefix backend @nestjs/throttler
 *
 * Then add to AppModule:
 *   ThrottlerModule.forRoot(THROTTLE_CONFIG)
 *
 * And apply to auth routes:
 *   @UseGuards(AuthThrottlerGuard)
 *   @Throttle(AUTH_THROTTLE)
 */

/** ThrottlerModule configuration object */
export const THROTTLE_CONFIG = {
  throttlers: [
    {
      name: 'global',
      ttl: 60_000,
      limit: 100,
    },
    {
      name: 'auth',
      ttl: 15 * 60 * 1000,
      limit: 5,
    },
  ],
};

/** Shorthand for applying auth-scoped throttle to a route */
export const AUTH_THROTTLE = {
  auth: { limit: 5, ttl: 15 * 60 * 1000 },
} as const;

/**
 * Custom guard that keys rate limits by IP+username and adds Retry-After header.
 * Extend ThrottlerGuard from @nestjs/throttler after installing the package.
 *
 * Example implementation (uncomment after installing @nestjs/throttler):
 *
 * import { ThrottlerGuard } from '@nestjs/throttler';
 *
 * @Injectable()
 * export class AuthThrottlerGuard extends ThrottlerGuard {
 *   protected async getTracker(req: Record<string, any>): Promise<string> {
 *     const ip = req.ip ?? 'unknown';
 *     const username = req.body?.email ?? req.body?.walletAddress ?? ip;
 *     return `${ip}:${username}`;
 *   }
 *
 *   protected async throwThrottlingException(context, detail): Promise<void> {
 *     const res = context.switchToHttp().getResponse();
 *     res.setHeader('Retry-After', String(Math.ceil(detail.ttl / 1000)));
 *     await super.throwThrottlingException(context, detail);
 *   }
 * }
 */
@Injectable()
export class AuthThrottlerGuard {
  canActivate(_context: ExecutionContext): boolean {
    // Placeholder — replace with ThrottlerGuard extension once @nestjs/throttler is installed
    return true;
  }
}