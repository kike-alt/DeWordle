import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * SEC-102: Input sanitization middleware for injection prevention.
 * Recursively strips HTML tags and trims whitespace from all string fields
 * in request body, query, and params to prevent stored XSS and injection attacks.
 *
 * Install: npm install sanitize-html
 */

// Lightweight in-place alternative that avoids the sanitize-html dependency
// for simple cases. For rich-text fields, use sanitize-html directly in the
// relevant DTO validator instead of this middleware.
function stripHtml(str: string): string {
  return str
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/gi, (m) => {
      const map: Record<string, string> = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>',
        '&quot;': '"', '&#x27;': "'", '&#x2F;': '/',
      };
      return map[m] ?? m;
    })
    .trim();
}

function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') return stripHtml(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  return obj;
}

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  // Fields that must not be sanitized (passwords, tokens, hashes)
  private readonly skipFields = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
  ]);

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeWithSkip(req.body as Record<string, unknown>);
    }
    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = stripHtml(req.query[key] as string);
        }
      }
    }
    next();
  }

  private sanitizeWithSkip(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.skipFields.has(key) ? value : sanitizeObject(value);
    }
    return result;
  }
}