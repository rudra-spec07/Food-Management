import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { DonationController } from '../controllers/donation.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';

import { singleImageUpload } from '../../../shared/middleware/upload.middleware';

const router = Router();
const controller = new DonationController();

// Apply authentication to all donation routes
router.use(authenticate);

// Donor-side donation management routes
router.post('/', requireRole(UserRole.DONOR), singleImageUpload('image'), controller.createDonation);
router.get('/my', requireRole(UserRole.DONOR), controller.getMyDonations);
router.get('/:donationId', requireRole(UserRole.DONOR), controller.getDonationById);
router.patch('/:donationId', requireRole(UserRole.DONOR), singleImageUpload('image'), controller.updateDonation);
router.post('/:donationId/cancel', requireRole(UserRole.DONOR), controller.cancelDonation);

export default router;
