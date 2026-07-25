import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap({
        error: (err) => {
          if (err?.status === 429) {
            const retryAfter = response.getHeader('Retry-After');
            if (!retryAfter) {
              response.setHeader('Retry-After', '60');
            }
          }
        },
      }),
    );
  }
}
