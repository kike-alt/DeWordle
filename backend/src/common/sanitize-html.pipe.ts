import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizeHtmlPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (typeof value === 'string') {
      return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
    }

    if (value && typeof value === 'object') {
      for (const key of Object.keys(value as Record<string, unknown>)) {
        const entry = (value as Record<string, unknown>)[key];
        if (typeof entry === 'string') {
          (value as Record<string, unknown>)[key] = sanitizeHtml(entry, {
            allowedTags: [],
            allowedAttributes: {},
          });
        }
      }
    }

    return value;
  }
}
