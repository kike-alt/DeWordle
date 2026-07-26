import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class WalletRateLimitGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    const ctx = context.switchToHttp();
    return { req: ctx.getRequest(), res: ctx.getResponse() };
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    const walletAddress =
      req.user?.walletAddress ?? req.user?.address ?? req.ip ?? 'anonymous';
    return Promise.resolve(walletAddress);
  }

  protected throwThrottlingException(): never {
    throw new ThrottlerException(
      'Rate limit exceeded. Please try again later.',
    );
  }
}
