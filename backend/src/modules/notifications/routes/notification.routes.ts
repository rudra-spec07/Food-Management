import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();
const controller = new NotificationController();

router.use('/notifications', authenticate);

router.get('/notifications', controller.getNotifications);
router.get('/notifications/unread-count', controller.getUnreadCount);
router.patch('/notifications/read-all', controller.markAllAsRead);
router.patch('/notifications/:notificationId/read', controller.markAsRead);

export default router;
