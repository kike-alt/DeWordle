import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, finalize, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      originalUrl?: string;
      url?: string;
    }>();
    const response = http.getResponse<{ statusCode: number }>();
    const startedAt = Date.now();
    let statusCode = response.statusCode;

    this.logger.log({
      msg: 'http.request.started',
      method: request.method,
      path: request.originalUrl ?? request.url,
    });

    return next.handle().pipe(
      tap({
        error: (error: { status?: number }) => {
          statusCode = error?.status ?? 500;
        },
        next: () => {
          statusCode = response.statusCode;
        },
      }),
      finalize(() => {
        this.logger.log({
          msg: 'http.request.completed',
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode,
          durationMs: Date.now() - startedAt,
        });
      }),
    );
  }
}
