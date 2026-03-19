import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import Redis from 'ioredis';
import path from 'path';
import dotenv from 'dotenv';

// Load env before other imports
dotenv.config({ path: path.join(__dirname, '../.env') });

import { logger } from '../lib/logger';

// Set service metadata for logs
logger.defaultMeta = { service: 'api-gateway' };

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-static-token-here';

const LEAD_SERVICE_URL = process.env.LEAD_SERVICE_URL || 'http://localhost:3001';
const ACTIVITY_SERVICE_URL = process.env.ACTIVITY_SERVICE_URL || 'http://localhost:3002';

// Redis setup for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// 1. Bearer Token Auth Middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  next();
};

// Apply auth to all /api routes
app.use('/api', authenticate);

// 3. Proxy Routing

// Activity Service Proxy handler
const activityProxy = createProxyMiddleware({
  target: ACTIVITY_SERVICE_URL,
  changeOrigin: true,
  pathFilter: (path) => path.includes('/activities') || path.startsWith('/api/activities'),
  on: {
    proxyReq: (proxyReq, req) => {
      logger.info(`Proxying to Activity Service: ${req.method} ${req.url}`);
      fixRequestBody(proxyReq, req);
    },
    proxyRes: (proxyRes, req) => {
      logger.info(`Activity Service responded with ${proxyRes.statusCode} for ${req.url}`);
    },
  },
});

// Lead Service Proxy handler
const leadProxy = createProxyMiddleware({
  target: LEAD_SERVICE_URL,
  changeOrigin: true,
  pathFilter: (path) => path.startsWith('/api/leads') && !path.includes('/activities'),
  on: {
    proxyReq: (proxyReq, req) => {
      logger.info(`Proxying to Lead Service: ${req.method} ${req.url}`);
      fixRequestBody(proxyReq, req);
    },
    proxyRes: (proxyRes, req) => {
      logger.info(`Lead Service responded with ${proxyRes.statusCode} for ${req.url}`);
    },
  },
});

// Use proxies on the root path so they can handle filtering themselves
app.use(activityProxy);
app.use(leadProxy);

app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
  logger.info(`Proxying to Lead Service at ${LEAD_SERVICE_URL}`);
  logger.info(`Proxying to Activity Service at ${ACTIVITY_SERVICE_URL}`);
});
