import 'reflect-metadata';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env';
import { logger } from './utils/logger';
import { globalRateLimiter } from './common/middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from './common/middlewares/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import accountsRoutes from './modules/accounts/accounts.routes';
import ingestRoutes from './modules/ingest/ingest.routes';
import tradesRoutes from './modules/trades/trades.routes';
import statisticsRoutes from './modules/statistics/statistics.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';

export function createApp(): Application {
  const app = express();

  // الأمان
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging لكل الطلبات
  app.use(
    morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
    }),
  );

  app.use(globalRateLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', usersRoutes);
  apiRouter.use('/accounts', accountsRoutes);
  apiRouter.use('/accounts/:accountId/trades', tradesRoutes);
  apiRouter.use('/accounts/:accountId/statistics', statisticsRoutes);
  apiRouter.use('/ingest', ingestRoutes); // مسارات الـ Expert Advisor (X-API-Key)
  apiRouter.use('/dashboard', dashboardRoutes);
  apiRouter.use('/notifications', notificationsRoutes);

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
