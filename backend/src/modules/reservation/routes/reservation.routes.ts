import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { ReservationController } from '../controllers/reservation.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';

const router = Router();
const controller = new ReservationController();

// Guard all reservation endpoints for WORKER and ADMIN roles
router.use('/reservations', authenticate, requireRole(UserRole.ADMIN, UserRole.WORKER));

router.post('/reservations', controller.createReservation);
router.get('/reservations', controller.getReservations);
router.get('/reservations/:reservationId', controller.getReservationDetail);
router.post('/reservations/:reservationId/release', controller.releaseReservation);

export default router;
