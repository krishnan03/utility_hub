import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

/**
 * Global API rate limiter.
 * Limits each IP to `config.rateLimitMax` requests per `config.rateLimitWindowMs` window.
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  },
});

export default apiLimiter;
