import express from 'express';
import {
    upsertJournalEntry,
    getAllJournals,
    deleteJournalEntry,
    updateJournalEntry
} from '../controllers/journal.controller.js';
import { isAdmin, protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', getAllJournals);
router.post('/', protect, isAdmin, upsertJournalEntry);
router.put('/:id', protect, updateJournalEntry);
router.delete('/:id', protect, isAdmin, deleteJournalEntry);

export default router;