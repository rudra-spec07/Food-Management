import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { DistributionController } from '../controllers/distribution.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';

const router = Router();
const controller = new DistributionController();

// Guard all distribution endpoints for WORKER and ADMIN roles
router.use('/distributions', authenticate, requireRole(UserRole.ADMIN, UserRole.WORKER));

router.post('/distributions', controller.createDistribution);
router.get('/distributions', controller.getDistributions);
router.get('/distributions/:distributionId', controller.getDistributionDetail);

export default router;
