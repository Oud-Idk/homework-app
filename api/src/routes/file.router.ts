import { Router } from 'express';
import { isAdmin, protect } from '../middleware/auth.middleware.js';
import { deleteFile, getAllFiles, getFiles, uploadFile } from "../controllers/file.controller.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

router.get('/', protect, getFiles);
router.get('/all', protect, isAdmin, getAllFiles);
router.post('/', protect, upload.single('file'), uploadFile);
router.delete('/:id', protect, deleteFile);

export default router;