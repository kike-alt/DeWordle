import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class QueryParamHardeningInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const queryKeys = Object.keys(request.query || {});

    // Acceptance Criteria: Block requests with an excessive number of filters
    if (queryKeys.length > 10) {
      throw new BadRequestException('Excessive query parameters. Filter criteria count exceeds safe limits.');
    }

    return next.handle();
  }
}