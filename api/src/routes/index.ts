import { Router } from 'express';
import homeworkRoutes from './homework.router.js';
import groupRoutes from './group.router.js';
import userRoutes from "./user.router.js";
import subscriptionRoutes from "./subscription.router.js";
import preferencesRoutes from "./preferences.router.js";
import postRouter from "./post.router.js";
import journalRouter from "./journal.router.js";
import fileRouter from "./file.router.js";
import classRouter from "./class.router.js";
import relationshipRouter from './relationship.router.js'

const router = Router();

router.use('/homeworks', homeworkRoutes);
router.use('/groups', groupRoutes);
router.use('/users', userRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/preferences', preferencesRoutes)
router.use('/posts', postRouter)
router.use('/journal', journalRouter)
router.use('/file', fileRouter)
router.use('/class', classRouter)
router.use('/relationship', relationshipRouter)

export default router;