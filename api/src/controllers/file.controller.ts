import { Request, Response } from 'express';
import FileModel, { IFile } from "../models/file.model.js";
import { minioClient } from "../services/minio.service.js";
import { meiliClient } from "../services/meilisearch.service.js";
import { handleServerError } from "../utils/errors.helper.js";
import { paginationSchema } from "../schemas/app.schemas.js";
import { QueryFilter } from "mongoose";

const constructPublicUrl = (file: IFile) => {
    return `${process.env.MINIO_PUBLIC_URL}/${file.bucket}/${file.filename}`;
};

export const uploadFile = async (req: Request, res: Response) => {
    const { file } = req;
    const userId = req.user?.sub;
    const bucketName = process.env.MINIO_BUCKET;

    if (!file) return res.status(400).json({ message: 'No file uploaded.' });
    if (!bucketName) return res.status(500).json({ message: 'Storage bucket not configured.' });

    const fileName = `${Date.now()}-${file.originalname}`;

    try {
        // 1. MinIO Upload
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) await minioClient.makeBucket(bucketName);

        await minioClient.putObject(bucketName, fileName, file.buffer, file.size, {
            'Content-Type': file.mimetype
        });

        // 2. Save to DB
        const newFile = await FileModel.create({
            filename: fileName,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            bucket: bucketName,
            uploadedBy: userId as string,
        });

        // 3. Meilisearch Indexing
        await meiliClient.index('files').addDocuments([{
            id: newFile._id.toString(),
            originalName: newFile.originalName,
            mimetype: newFile.mimetype,
            createdAt: newFile.createdAt,
        }]);

        res.status(201).json({
            message: 'File uploaded and indexed successfully!',
            fileId: newFile._id,
            url: constructPublicUrl(newFile),
        });
    } catch (error) {
        handleServerError(res, error, "uploadFile");
    }
};

export const deleteFile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    try {
        const file = await FileModel.findById(id);
        if (!file) return res.status(404).json({ message: 'File not found.' });

        // Authorization: Only owner or admin
        if (file.uploadedBy.toString() !== userId && userRole !== 'admin') {
            return res.status(403).json({ message: "Not allowed to delete this file." });
        }

        // Parallel Cleanup: Delete from Storage, Search, and DB at once
        await Promise.all([
            minioClient.removeObject(file.bucket, file.filename),
            meiliClient.index('files').deleteDocument(file._id.toString()),
            FileModel.findByIdAndDelete(id)
        ]);

        res.status(200).json({ message: 'File deleted successfully.' });
    } catch (error) {
        handleServerError(res, error, "deleteFile");
    }
};

const fetchFiles = async (req: Request, res: Response, filterByUserId: boolean) => {
    const { page, limit, q } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    try {
        const query: QueryFilter<IFile> = {};
        if (filterByUserId && req.user?.sub) query.uploadedBy = req.user?.sub;
        if (q) query.originalName = { $regex: q, $options: 'i' };

        const [filesFromDb, totalFiles] = await Promise.all([
            FileModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IFile[]>(),
            FileModel.countDocuments(query)
        ]);

        const filesWithUrls = filesFromDb.map(file => ({
            ...file,
            url: constructPublicUrl(file)
        }));

        res.status(200).json({
            files: filesWithUrls,
            totalFiles,
            totalPages: Math.ceil(totalFiles / limit),
            currentPage: page,
        });
    } catch (error) {
        handleServerError(res, error, filterByUserId ? "getFiles" : "getAllFiles");
    }
};

export const getFiles = (req: Request, res: Response) => fetchFiles(req, res, true);
export const getAllFiles = (req: Request, res: Response) => fetchFiles(req, res, false);