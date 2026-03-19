import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import leadRoutes from './routes/lead.routes';
import { correlationIdMiddleware } from '../middleware/correlation';
import { errorHandler } from '../middleware/error';
import { leadRateLimiter } from '../middleware/rate-limit';
import { logger } from '../lib/logger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(leadRateLimiter);

// Middlewares
app.use(correlationIdMiddleware);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { correlationId: req.headers['x-correlation-id'] });
  next();
});

app.use('/api', leadRoutes);

// Error Handler
app.use(errorHandler);

export default app;
