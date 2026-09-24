import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import Redis from 'ioredis';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

@Injectable()
export class SlidingWindowRateLimiterGuard implements CanActivate {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const key = `ratelimit:${ip}`;
    const now = Date.now();

    await this.redis.zremrangebyscore(key, 0, now - WINDOW_MS);
    const count = await this.redis.zcard(key);

    if (count >= MAX_REQUESTS) {
      throw new HttpException(
        { message: 'Too Many Requests' },
        HttpStatus.TOO_MANY_REQUESTS,
        { description: 'Retry-After: 60' },
      );
    }

    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.pexpire(key, WINDOW_MS);
    return true;
  }
}
