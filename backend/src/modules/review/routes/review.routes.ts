import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';
import { ReviewController } from '../controllers/review.controller';
import { validateDonationIdParam, validateRequestBody, validateRequestQuery } from '../validators/review.validator';
import { reviewQuerySchema } from '../dto/review-query.dto';
import { rejectDonationSchema } from '../dto/reject-donation.dto';

const router = Router();
const controller = new ReviewController();

// Require authentication and ADMIN role for all review endpoints
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

router.get('/review', validateRequestQuery(reviewQuerySchema), controller.getReviewQueue);
router.get('/:donationId', validateDonationIdParam, controller.getReviewDetail);
router.post('/:donationId/approve', validateDonationIdParam, controller.approveDonation);
router.post('/:donationId/reject', validateDonationIdParam, validateRequestBody(rejectDonationSchema), controller.rejectDonation);
router.get('/:donationId/reviews', validateDonationIdParam, controller.getReviewHistory);

export default router;
