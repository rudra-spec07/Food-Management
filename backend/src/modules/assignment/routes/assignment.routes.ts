import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';
import { AssignmentController } from '../controllers/assignment.controller';

const router = Router();
const controller = new AssignmentController();

// Admin Assignment Endpoints
router.get(
  '/admin/donations/assignment-queue',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getAssignmentQueue
);

router.post(
  '/admin/donations/:donationId/assign',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.assignWorker
);

router.get(
  '/admin/donations/:donationId/assignments',
  authenticate,
  requireRole(UserRole.ADMIN),
  controller.getAssignmentHistory
);

// Worker Assignment Endpoints
router.get(
  '/worker/assignments',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.getWorkerAssignments
);

router.get(
  '/worker/assignments/:assignmentId',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.getWorkerAssignmentDetail
);

router.post(
  '/worker/assignments/:assignmentId/accept',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.acceptAssignment
);

router.post(
  '/worker/assignments/:assignmentId/reject',
  authenticate,
  requireRole(UserRole.WORKER),
  controller.rejectAssignment
);

export default router;
