import { Injectable, NestMiddleware } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
export const requestContextStorage = new AsyncLocalStorage<{
  requestId: string;
}>();

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers[REQUEST_ID_HEADER];
    const suppliedId = typeof header === 'string' && isUUID(header) ? header : null;
    const requestId = suppliedId ?? randomUUID();

    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    requestContextStorage.run({ requestId }, () => next());
  }
}
