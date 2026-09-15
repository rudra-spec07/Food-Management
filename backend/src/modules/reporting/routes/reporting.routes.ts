import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { ReportingController } from '../controllers/reporting.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';

const router = Router();
const controller = new ReportingController();

// Admin Reporting & Dashboard Routes (ADMIN only)
router.get(
  '/admin/dashboard',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getAdminDashboard
);

router.get(
  '/admin/reports/donations',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getDonationReport
);

router.get(
  '/admin/reports/donations/trend',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getDonationTrend
);

router.get(
  '/admin/reports/donations/status-distribution',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getDonationStatusDistribution
);

router.get(
  '/admin/reports/pickups',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getPickupReport
);

router.get(
  '/admin/reports/workers',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getWorkerMetrics
);

router.get(
  '/admin/reports/workers/:workerId',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getWorkerDetailMetrics
);

router.get(
  '/admin/activity',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getActivityLogs
);

router.get(
  '/admin/reports/donations/export',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.exportDonationsCSV
);

// Worker Operational Dashboard Route (WORKER only)
router.get(
  '/worker/dashboard',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.getWorkerDashboard
);

export default router;
