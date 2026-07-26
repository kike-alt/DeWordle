import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * SEC-101: Content Security Policy headers for XSS prevention.
 * Generates a per-request nonce for inline scripts and styles.
 * Attaches the nonce to res.locals.cspNonce for use in templates.
 */
@Injectable()
export class CspMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const nonce = randomBytes(16).toString('base64');
    res.locals.cspNonce = nonce;

    const isProd = process.env.NODE_ENV === 'production';

    const policy = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'${isProd ? '' : " 'unsafe-eval'"}`,
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https://assets.dewordle.io`,
      `connect-src 'self' https://soroban-testnet.stellar.org wss:`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `object-src 'none'`,
      `upgrade-insecure-requests`,
    ].join('; ');

    res.setHeader('Content-Security-Policy', policy);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    next();
  }
}