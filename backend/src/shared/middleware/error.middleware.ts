import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.id || 'unknown';

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const formattedMessage = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: formattedMessage,
        requestId,
      },
    });
    return;
  }

  // Handle unexpected internal server errors cleanly without leaking internal stack traces
  console.error(`[Unhandled Error] RequestID: ${requestId}`, err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
      requestId,
    },
  });
};
