import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { requireRole } from '../../../shared/middleware/role.guard';

const router = Router();
const controller = new InventoryController();

// Guard all inventory endpoints for WORKER and ADMIN roles
router.use('/inventory', authenticate, requireRole(UserRole.ADMIN, UserRole.WORKER));

router.get('/inventory/summary', controller.getSummary);
router.get('/inventory/items', controller.getItems);
router.get('/inventory/items/:inventoryId', controller.getItemDetail);
router.get('/inventory/items/:inventoryId/history', controller.getItemHistory);

export default router;
