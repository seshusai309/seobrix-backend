import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

const defaultWindowMs = 60 * 1000; // 1 minute

interface RateLimitOptions {
  windowMs?: number;
  max: number;
}

const calculateRetryAfterSeconds = (req: Request, windowMs: number): number => {
  const resetTime = (req as any).rateLimit?.resetTime as number | undefined;
  const retryAfterMs = (resetTime || Date.now() + windowMs) - Date.now();
  return Math.ceil(retryAfterMs / 1000);
};

export const rateLimiter = ({ windowMs = defaultWindowMs, max }: RateLimitOptions) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const retryAfterSeconds = calculateRetryAfterSeconds(req, windowMs);
      logger.warn('system', 'rateLimit', `Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down.',
          retryAfter: retryAfterSeconds,
        },
      });
    },
  });
};

// Pre-built limiters
export const loginRateLimiter = rateLimiter({ windowMs: 60 * 1000, max: 5 });
export const apiRateLimiter = rateLimiter({ windowMs: 60 * 1000, max: 60 });
