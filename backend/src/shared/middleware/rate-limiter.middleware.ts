import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
  max: env.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req: any, res: any) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts, please try again later.',
        requestId: req.id || 'unknown',
      },
    });
  },
});

export const registerRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_REGISTER_WINDOW_MS,
  max: env.RATE_LIMIT_REGISTER_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req: any, res: any) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many registration attempts from this IP, please try again later.',
        requestId: req.id || 'unknown',
      },
    });
  },
});

export const changePasswordRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_CHANGE_PASSWORD_WINDOW_MS,
  max: env.RATE_LIMIT_CHANGE_PASSWORD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req: any, res: any) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many password change attempts, please try again later.',
        requestId: req.id || 'unknown',
      },
    });
  },
});
