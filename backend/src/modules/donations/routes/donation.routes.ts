import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { DonationController } from '../controllers/donation.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';

const router = Router();
const controller = new DonationController();

// Apply authentication to all donation routes
router.use(authenticate);

// Donor-side donation management routes
router.post('/', requireRole(UserRole.DONOR), controller.createDonation);
router.get('/my', requireRole(UserRole.DONOR), controller.getMyDonations);
router.get('/:donationId', requireRole(UserRole.DONOR), controller.getDonationById);
router.patch('/:donationId', requireRole(UserRole.DONOR), controller.updateDonation);
router.post('/:donationId/cancel', requireRole(UserRole.DONOR), controller.cancelDonation);

export default router;
