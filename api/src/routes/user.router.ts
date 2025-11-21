import { Router } from 'express';
import { protect, isAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import { getUsers, updateUserRole } from '../controllers/user.controller.js';
import { getUserPosts } from "../controllers/feed/post.controller.js";

const router = Router();

router.use(protect, isAdmin);

router.get('/', getUsers);
router.put('/:userId/role', updateUserRole);
router.get('/:userId/posts', optionalAuth, getUserPosts);

export default router;