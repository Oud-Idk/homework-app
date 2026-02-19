import { Router } from "express";
import {
    addRelationship,
    listRelationshipsOfUser,
    getRelationshipsByClass,
    updateRelationship,
    deleteRelationship
} from "../controllers/people/relationship.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    createRelationshipSchema,
    updateRelationshipSchema,
    deleteRelationshipSchema,
    classIdParamsSchema
} from "../schemas/app.schemas.js";
import {isAdmin, protect} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/",
    protect, isAdmin,
    listRelationshipsOfUser
);
router.post("/",
    validate({ body: createRelationshipSchema }),
    protect,
    addRelationship
);
router.get("/class/:classroomId",
    validate({ params: classIdParamsSchema }),
    protect, isAdmin,
    getRelationshipsByClass
);
router.patch("/",
    validate({ body: updateRelationshipSchema }),
    protect,
    updateRelationship
);
router.delete("/",
    validate({ body: deleteRelationshipSchema }),
    protect, isAdmin,
    deleteRelationship
);

export default router;