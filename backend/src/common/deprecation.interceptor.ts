import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { DEPRECATED_METADATA, SUNSET_METADATA } from './deprecated.decorator';

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const deprecatedVersion = this.reflector.get<string>(
      DEPRECATED_METADATA,
      handler,
    );
    const sunsetDate = this.reflector.get<string>(SUNSET_METADATA, handler);

    if (!deprecatedVersion) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        response.setHeader('Deprecation', `true`);
        response.setHeader(
          'Sunset',
          sunsetDate ||
            new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toUTCString(),
        );
        response.setHeader('Link', `</api/v2>; rel="successor-version"`);
      }),
    );
  }
}
