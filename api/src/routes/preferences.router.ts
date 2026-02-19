import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    getAllPreferences,
    addNotificationPreference,
    deleteNotificationPreference,
    updateViewPreferences, updateClassroom
} from '../controllers/preferences/preferences.controller.js';
import {validate} from "../middlewares/validate.middleware.js";
import {
    addNotificationPrefSchema, classIdParamsSchema,
    preferenceIdParamSchema,
    updateViewPreferencesSchema
} from "../schemas/app.schemas.js";

const router = Router();
router.use(protect);

router.get('/', getAllPreferences);
router.patch('/view', validate({ body: updateViewPreferencesSchema }), updateViewPreferences);
router.post('/notifications', validate({ body: addNotificationPrefSchema }), addNotificationPreference);
router.delete('/notifications/:preferenceId', validate({ params: preferenceIdParamSchema }), deleteNotificationPreference);
router.patch('/classroom/:classroomId', validate({ params: classIdParamsSchema }), updateClassroom);

export default router;