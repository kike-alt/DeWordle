import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../dewordle/metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const routePath = route?.path || request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          this.metricsService.httpRequestDuration.observe(
            { method, route: routePath, status_code: String(statusCode) },
            duration,
          );

          this.metricsService.httpRequestCounter.inc({
            method,
            route: routePath,
            status_code: String(statusCode),
          });

          if (statusCode >= 400) {
            this.metricsService.errorRateCounter.inc({
              method,
              route: routePath,
              status_code: String(statusCode),
            });
          }
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = error.status || 500;

          this.metricsService.httpRequestDuration.observe(
            { method, route: routePath, status_code: String(statusCode) },
            duration,
          );

          this.metricsService.httpRequestCounter.inc({
            method,
            route: routePath,
            status_code: String(statusCode),
          });

          this.metricsService.errorRateCounter.inc({
            method,
            route: routePath,
            status_code: String(statusCode),
          });
        },
      }),
    );
  }
}
