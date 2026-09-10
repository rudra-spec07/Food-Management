import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { registerRateLimiter, loginRateLimiter } from '../../../shared/middleware/rate-limiter.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/logout', authenticate, authController.logout);

export default router;
