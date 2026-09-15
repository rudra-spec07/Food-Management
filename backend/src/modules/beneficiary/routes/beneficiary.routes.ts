import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { BeneficiaryController } from '../controllers/beneficiary.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';

const router = Router();
const controller = new BeneficiaryController();

// All beneficiary routes require authentication
router.use('/beneficiaries', authenticate);

// ADMIN only routes for creation and modification
router.post('/beneficiaries', requireRole(UserRole.ADMIN), controller.createBeneficiary);
router.patch('/beneficiaries/:beneficiaryId', requireRole(UserRole.ADMIN), controller.updateBeneficiary);

// ADMIN and WORKER routes for viewing and history
router.get('/beneficiaries', requireRole(UserRole.ADMIN, UserRole.WORKER), controller.getBeneficiaries);
router.get('/beneficiaries/:beneficiaryId', requireRole(UserRole.ADMIN, UserRole.WORKER), controller.getBeneficiaryDetail);
router.get('/beneficiaries/:beneficiaryId/history', requireRole(UserRole.ADMIN, UserRole.WORKER), controller.getBeneficiaryHistory);

export default router;
