import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { followToHomework, unfollowFromHomework } from '../controllers/homework/follow.controller.js';
import {validate} from "../middlewares/validate.middleware.js";
import {idParamSchema} from "../schemas/app.schemas.js";

const router = Router({ mergeParams: true });

router.post(
    '/',
    protect,
    validate({ params: idParamSchema }),
    followToHomework
);

router.delete(
    '/',
    protect,
    validate({ params: idParamSchema }),
    unfollowFromHomework
);
export default router;