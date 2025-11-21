import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { followToHomework, unfollowFromHomework } from '../controllers/homework/follow.controller.js';

const router = Router({ mergeParams: true });

router.post('/', protect, followToHomework);
router.delete('/', protect, unfollowFromHomework);

export default router;