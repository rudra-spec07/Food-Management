import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';
import { PickupController } from '../controllers/pickup.controller';

const router = Router();
const controller = new PickupController();

// Worker Endpoints
router.get(
  '/worker/pickups',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.getWorkerPickups
);

router.get(
  '/worker/pickups/:pickupId',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.getWorkerPickupDetail
);

router.post(
  '/worker/pickups/:pickupId/start',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.startPickup
);

router.post(
  '/worker/pickups/:pickupId/complete',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.completePickup
);

router.post(
  '/worker/pickups/:pickupId/fail',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.failPickup
);

// Admin Endpoints
router.get(
  '/admin/pickups',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getAdminPickups
);

router.get(
  '/admin/pickups/:pickupId',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getAdminPickupDetail
);

router.get(
  '/admin/pickups/:pickupId/events',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getAdminPickupEvents
);

export default router;
