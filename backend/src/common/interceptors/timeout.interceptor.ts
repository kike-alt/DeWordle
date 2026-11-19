import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const configured = Number.parseInt(process.env.HTTP_TIMEOUT_MS ?? '', 10);
    const timeoutMs = Number.isFinite(configured) && configured > 0 ? configured : 15_000;

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((error: unknown) => {
        if (!(error instanceof TimeoutError)) {
          return throwError(() => error);
        }

        this.logger.warn({
          msg: 'http.request.timeout',
          method: request.method,
          path: request.originalUrl ?? request.url,
          timeoutMs,
        });
        return throwError(() => new RequestTimeoutException('Request timed out'));
      }),
    );
  }
}
