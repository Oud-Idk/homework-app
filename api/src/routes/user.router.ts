import { Router } from 'express';
import { protect, isAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { getUsers, updateUserRole } from '../controllers/user.controller.js';
import { paginationSchema, updateUserRoleSchema, userIdParamSchema } from '../schemas/app.schemas.js';
import { getUserPosts } from "../controllers/feed/post.controller.js";

const router = Router();

router.use(protect, isAdmin);

router.get('/', getUsers);

router.patch(
    '/:userId/role',
    validate({ params: userIdParamSchema, body: updateUserRoleSchema }),
    updateUserRole
);

router.get(
    '/:userId/posts',
    validate({ params: userIdParamSchema, query: paginationSchema }),
    getUserPosts,
);

export default router;