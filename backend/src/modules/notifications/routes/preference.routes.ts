import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.middleware';
import { PreferenceController } from '../controllers/preference.controller';

const router = Router();
const controller = new PreferenceController();

router.use('/notification-preferences', authenticate);

router.get('/notification-preferences', controller.getPreferences);
router.patch('/notification-preferences', controller.updatePreference);

export default router;
