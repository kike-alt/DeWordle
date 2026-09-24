import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

const TTL_MS = 30_000;
const cache = new Map<string, { body: unknown; expiresAt: number }>();

@Injectable()
export class LeaderboardCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const key = req.originalUrl ?? req.url;
    const hit = cache.get(key);

    if (hit && hit.expiresAt > Date.now()) {
      return of(hit.body);
    }

    return next.handle().pipe(
      tap((body) => cache.set(key, { body, expiresAt: Date.now() + TTL_MS })),
    );
  }
}

export function invalidateLeaderboardCache(): void {
  cache.clear();
}
