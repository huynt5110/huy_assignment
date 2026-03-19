import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import activityRoutes from './routes/activity.routes';
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

// Routes
app.use('/api', activityRoutes);

// Error Handler
app.use(errorHandler);

export default app;
