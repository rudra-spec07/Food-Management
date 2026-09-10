import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestIdMiddleware } from './shared/middleware/request-id.middleware';
import { errorMiddleware } from './shared/middleware/error.middleware';
import { NotFoundError } from './shared/errors/app-error';
import authRoutes from './modules/auth-user/routes/auth.routes';
import userRoutes from './modules/auth-user/routes/user.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Handle unknown routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
});

// Global error handler
app.use(errorMiddleware);

export default app;
