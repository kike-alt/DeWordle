import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const correlationStorage = new AsyncLocalStorage<{ correlationId: string }>();

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? randomUUID();
    res.setHeader('X-Correlation-ID', correlationId);

    correlationStorage.run({ correlationId }, () => next());
  }
}

export function logJson(context: string, message: string): void {
  const correlationId = correlationStorage.getStore()?.correlationId;
  console.log(JSON.stringify({ correlationId, timestamp: new Date().toISOString(), context, message }));
}
