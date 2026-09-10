import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { changePasswordRateLimiter } from '../../../shared/middleware/rate-limiter.middleware';

const router = Router();
const userController = new UserController();
const authController = new AuthController();

router.get('/me', authenticate, userController.getMe);
router.patch('/me', authenticate, userController.updateMe);
router.post('/me/change-password', authenticate, changePasswordRateLimiter, authController.changePassword);

export default router;
