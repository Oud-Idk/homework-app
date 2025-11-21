import { Router } from 'express';
import { isAdmin, optionalAuth, protect } from '../middleware/auth.middleware.js';
import {
    getHomeworks,
    createHomework,
    deleteHomework,
    toggleHomeworkCompletion,
    updateHomework,
} from '../controllers/homework/homework.controller.js';

import followRouter from './follow.router.js';

const router = Router();

router.get('/', optionalAuth, getHomeworks);
router.post('/', protect, createHomework);
router.delete('/:id', protect, isAdmin, deleteHomework);
router.patch('/:id/toggle', protect, toggleHomeworkCompletion);
router.put('/:id', protect, isAdmin, updateHomework);
router.use('/:id/follow', followRouter);

export default router;