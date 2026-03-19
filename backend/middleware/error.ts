import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || 'no-id';

  // Log error with context
  logger.error(`Error in ${req.method} ${req.url}`, {
    correlationId,
    message: err.message,
    stack: err.stack,
    error: err
  });

  // Check if response already sent
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    correlationId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
