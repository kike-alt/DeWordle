import compression from 'compression';
import type { Request, Response } from 'express';

const THRESHOLD_BYTES = 1024;

export const compressionMiddleware = compression({
  threshold: THRESHOLD_BYTES,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});
