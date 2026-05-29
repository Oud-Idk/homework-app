import { Router } from 'express';
import { protect, isAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createGroupSchema, updateGroupSchema, groupIdParamSchema } from '../schemas/app.schemas.js';
import { createGroup, deleteGroup, updateGroup, getGroups } from '../controllers/homework/group.controller.js';

const router = Router();

router.get('/', getGroups);
router.post('/', protect, isAdmin, validate({ body: createGroupSchema }), createGroup);
router.patch('/:groupId', protect, isAdmin, validate({ params: groupIdParamSchema, body: updateGroupSchema }), updateGroup);
router.delete('/:groupId', protect, isAdmin, validate({ params: groupIdParamSchema }), deleteGroup);

export default router;