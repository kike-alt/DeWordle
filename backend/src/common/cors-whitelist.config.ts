import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function buildAllowedOrigins(): (string | RegExp)[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => (origin.startsWith('/') && origin.endsWith('/') ? new RegExp(origin.slice(1, -1)) : origin));
}

export const corsWhitelistOptions: CorsOptions = {
  origin(origin, callback) {
    const allowed = buildAllowedOrigins();
    const isAllowed =
      !origin || allowed.some((entry) => (entry instanceof RegExp ? entry.test(origin) : entry === origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed'), false);
    }
  },
};
