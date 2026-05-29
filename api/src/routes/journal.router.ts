import express from 'express';
import {
    upsertJournalEntry,
    getAllJournals,
    deleteJournalEntry,
    updateJournalEntry
} from '../controllers/journal.controller.js';
import {validate} from "../middlewares/validate.middleware.js";
import {
    idParamSchema,
    journalSchema,
    journalUpsertSchema,
    updateJournalSchema
} from "../schemas/app.schemas.js";
import {isAdmin, protect} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
    '/',
    validate({ query: journalSchema }),
    getAllJournals
);

router.post(
    '/',
    validate({ body: journalUpsertSchema }),
    protect, isAdmin,
    upsertJournalEntry
);

router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateJournalSchema }),
    protect,
    updateJournalEntry
);

router.delete(
    '/:id',
    validate({ params: idParamSchema }),
    protect, isAdmin,
    deleteJournalEntry
);

export default router;