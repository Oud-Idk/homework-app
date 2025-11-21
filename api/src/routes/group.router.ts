import { Router } from 'express';
import { protect, isAdmin } from '../middleware/auth.middleware.js';
import { getGroups, createGroup, deleteGroup, updateGroup } from '../controllers/homework/group.controller.js';

const router = Router();

router.post('/', protect, isAdmin, createGroup);
router.get('/', getGroups);
router.put('/:groupId', protect, isAdmin, updateGroup);
router.delete('/:groupId', protect, isAdmin, deleteGroup);

export default router;