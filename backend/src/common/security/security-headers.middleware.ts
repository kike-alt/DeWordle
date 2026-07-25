import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * SEC-105: Security headers implementation.
 * Sets OWASP-recommended HTTP security headers on every response.
 *
 * Add to AppModule middleware consumer:
 *   consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly isProd = process.env.NODE_ENV === 'production';

  use(req: Request, res: Response, next: NextFunction): void {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // HTTP Strict Transport Security (2 years, include subdomains, preload)
    if (this.isProd) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload',
      );
    }

    // Referrer policy — send origin only for same-origin, full for same-site
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Disable legacy browser XSS filter (modern browsers ignore it; old IE
    // had bugs where mode=block introduced new vulns)
    res.setHeader('X-XSS-Protection', '0');

    // Restrict access to browser APIs
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    );

    // Cross-Origin policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    // Remove server fingerprint
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  }
}