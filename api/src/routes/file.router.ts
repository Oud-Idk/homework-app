import { Router } from 'express';
import { isAdmin, protect } from '../middlewares/auth.middleware.js';
import { deleteFile, getAllFiles, getFiles, uploadFile } from "../controllers/file.controller.js";
import multer from "multer";
import {validate} from "../middlewares/validate.middleware.js";
import {idParamSchema, paginationSchema} from "../schemas/app.schemas.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

router.get('/', protect, validate({ query: paginationSchema }), getFiles);
router.get('/all', protect, isAdmin, validate({ query: paginationSchema }), getAllFiles);
router.post('/', protect, upload.single('file'), uploadFile);
router.delete('/:id', protect, validate({ params: idParamSchema }), deleteFile);

export default router;