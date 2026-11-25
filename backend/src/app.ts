import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(cors({ origin: origins.includes('*') ? true : origins }));
  // Settings carry the logo and signature as base64 images, hence the larger limit.
  app.use(express.json({ limit: '5mb' }));
  if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use('/api', router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
