/**
 * SEC-108: Authentication rate limiting and brute-force protection.
 * Uses @nestjs/throttler for per-route and per-IP limiting.
 *
 * Install: npm install @nestjs/throttler
 * Add ThrottlerModule to AppModule:
 *   ThrottlerModule.forRoot(THROTTLE_CONFIG)
 */
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const THROTTLE_CONFIG: ThrottlerModuleOptions = {
  throttlers: [
    {
      // Global default: 100 requests per 60 s window
      name: 'global',
      ttl: 60_000,
      limit: 100,
    },
    {
      // Stricter limit for auth endpoints: 5 attempts per 15 min
      name: 'auth',
      ttl: 15 * 60 * 1000,
      limit: 5,
    },
  ],
};

/**
 * Decorator shorthand for auth-scoped throttling.
 * Usage: @UseGuards(ThrottlerGuard) @Throttle({ auth: { limit: 5, ttl: 900000 } })
 */
export const AUTH_THROTTLE = {
  auth: { limit: 5, ttl: 15 * 60 * 1000 },
} as const;

/**
 * Custom ThrottlerGuard that returns 429 with Retry-After header.
 * Extend this in auth.controller.ts to apply brute-force protection.
 */
import {
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Key by IP + username to isolate per-account attempts
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const username: string = req.body?.email ?? req.body?.walletAddress ?? ip;
    return `${ip}:${username}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse();
    const retryAfter = Math.ceil(throttlerLimitDetail.ttl / 1000);
    response.setHeader('Retry-After', String(retryAfter));
    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}