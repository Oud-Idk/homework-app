import { Router } from 'express';
import {
    addClass,
    listClass,
    updateClass,
    deleteClass,
    listStudentInClass,
} from '../controllers/people/class.controller.js';
import {
    classParamsSchema,
    updateClassSchema,
    deleteClassSchema,
    classIdParamsSchema
} from '../schemas/app.schemas.js';
import { validate } from '../middlewares/validate.middleware.js';
import {isAdmin, protect} from "../middlewares/auth.middleware.js";

const router = Router();

router.get('/', listClass);
router.get("/:classroomId", validate({ params: classIdParamsSchema }), listStudentInClass)
router.post(
    '/',
    protect,
    isAdmin,
    validate({ body: classParamsSchema }),
    addClass
);
router.patch(
    '/',
    protect,
    isAdmin,
    validate({ body: updateClassSchema }),
    updateClass
);
router.delete(
    '/',
    protect,
    isAdmin,
    validate({ body: deleteClassSchema }),
    deleteClass
);

export default router;