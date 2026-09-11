import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';
import { AdminWorkerController } from '../controllers/admin-worker.controller';

const router = Router();
const controller = new AdminWorkerController();

// GET /api/v1/admin/workers (ADMIN only)
// Returns a paginated list of WORKER users. Role is always forced to WORKER at DB level.
router.get(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.listWorkers
);

// POST /api/v1/admin/workers (ADMIN only)
router.post(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.createWorker
);

export default router;
