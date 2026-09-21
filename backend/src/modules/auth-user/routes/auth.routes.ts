import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { registerRateLimiter, loginRateLimiter, forgotPasswordRateLimiter } from '../../../shared/middleware/rate-limiter.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/forgot-password', forgotPasswordRateLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authenticate, authController.logout);

export default router;
