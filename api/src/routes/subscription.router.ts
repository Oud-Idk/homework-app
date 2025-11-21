import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { saveSubscription } from '../controllers/preferences/subscription.controller.js';

const router = Router();
router.post('/', protect, saveSubscription);
export default router;