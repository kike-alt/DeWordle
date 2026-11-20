import {
  ExecutionContext,
  Injectable,
  ThrottlerException,
} from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';
import type { Request, Response } from 'express';

interface WalletRequest extends Request {
  user?: { id?: number; walletAddress?: string };
}

@Injectable()
export class WordValidationThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(): Promise<boolean> {
    return false;
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.ip ?? 'unknown');
  }

  protected handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const request =
      requestProps.context.switchToHttp().getRequest<WalletRequest>();
    const hasValidWallet = Boolean(
      request.user?.id && request.user.walletAddress,
    );

    return super.handleRequest({
      ...requestProps,
      limit: hasValidWallet ? 120 : 60,
      ttl: 60_000,
      blockDuration: 60_000,
    });
  }

  protected throwThrottlingException(context: ExecutionContext): never {
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Retry-After', '60');
    throw new ThrottlerException(
      'Rate limit exceeded. Please try again later.',
    );
  }
}
