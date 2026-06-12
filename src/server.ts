import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import './config/passport'; // registers all passport strategies
import { apiRateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import agencyRoutes from './routes/agencyRoutes';
import userRoutes from './routes/userRoutes';
import clientRoutes from './routes/clientRoutes';
import reviewRoutes from './routes/reviewRoutes';
import portalRoutes from './routes/portalRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Required for express-rate-limit to correctly identify client IPs behind a proxy
app.set('trust proxy', 1);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, origin);
      if (
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, origin);
      }
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Global rate limit ────────────────────────────────────────────────────────
app.use('/api', apiRateLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/agency', agencyRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/portal', portalRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'SEO Brix Backend is healthy',
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('system', 'globalErrorHandler', err.message || 'Unknown error');
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function bootstrap() {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.success('system', 'bootstrap', `SEO Brix API running on port ${PORT}`);
    logger.success('system', 'bootstrap', `Environment: ${process.env.NODE_ENV}`);
    logger.success('system', 'bootstrap', `Health: http://localhost:${PORT}/health`);
  });

  // ─── Graceful shutdown (same pattern as Jewells backend) ──────────────────
  process.on('unhandledRejection', (err: any) => {
    logger.error('system', 'unhandledRejection', `Unhandled Rejection: ${err?.message || err}`);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    logger.success('system', 'SIGTERM', 'SIGTERM received. Shutting down gracefully.');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    logger.success('system', 'SIGINT', 'SIGINT received. Shutting down gracefully.');
    server.close(() => process.exit(0));
  });
}

bootstrap();
