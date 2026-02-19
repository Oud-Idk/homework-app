import { Router } from 'express';
import { protect, isAdmin, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createHomeworkSchema, updateHomeworkSchema, idParamSchema } from '../schemas/app.schemas.js';
import {
    createHomework, deleteHomework, updateHomework, getHomeworks, toggleHomeworkCompletion
} from '../controllers/homework/homework.controller.js';
import followRouter from "./follow.router.js";

const router = Router();

router.get('/', optionalAuth, getHomeworks);
router.post('/', protect, validate({ body: createHomeworkSchema }), createHomework);
router.delete('/:id', protect, isAdmin, validate({ params: idParamSchema }), deleteHomework);
router.patch('/:id', protect, isAdmin, validate({ params: idParamSchema, body: updateHomeworkSchema }), updateHomework);
router.patch('/:id/toggle', protect, validate({ params: idParamSchema }), toggleHomeworkCompletion);

router.use('/:id/follow', followRouter);

export default router;