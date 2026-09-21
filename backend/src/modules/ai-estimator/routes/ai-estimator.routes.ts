import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { AiEstimatorController } from '../controllers/ai-estimator.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';
import { aiQuantityRateLimiter } from '../../../shared/middleware/rate-limiter.middleware';

const router = Router();
const controller = new AiEstimatorController();

router.use(authenticate);

router.post(
  '/estimate-quantity',
  requireRole(UserRole.DONOR, UserRole.ADMIN),
  aiQuantityRateLimiter,
  controller.estimateQuantity
);

export default router;
