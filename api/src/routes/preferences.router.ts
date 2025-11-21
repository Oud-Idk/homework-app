import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
    getAllPreferences,
    addNotificationPreference,
    deleteNotificationPreference,
    updateViewPreferences
} from '../controllers/preferences/preferences.controller.js';

const router = Router();
router.use(protect);

router.get('/', getAllPreferences);
router.put('/view', updateViewPreferences);
router.post('/notifications', addNotificationPreference);
router.delete('/notifications/:preferenceId', deleteNotificationPreference);

export default router;