import { Request, Response, NextFunction } from 'express';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-correlation-id'] = correlationId as string;
  res.setHeader('x-correlation-id', correlationId as string);
  next();
};
