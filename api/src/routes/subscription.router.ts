import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { saveSubscription } from '../controllers/preferences/subscription.controller.js';
import {validate} from "../middlewares/validate.middleware.js";
import {pushSubscriptionSchema} from "../schemas/app.schemas.js";

const router = Router();
router.post('/', protect, validate({ body: pushSubscriptionSchema }), saveSubscription);
export default router;