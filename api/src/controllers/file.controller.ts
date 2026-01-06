import type { Request, Response } from 'express';
import { minioClient } from "../services/minio.service.js";
import { meiliClient } from "../services/meilisearch.service.js";
import FileModel, { IFile } from "../models/file.model.js";
import mongoose from "mongoose";

const constructPublicUrl = (file: IFile ) => {
    return `${process.env.MINIO_PUBLIC_URL}/${file.bucket}/${file.filename}`;
}

export const uploadFile = async (req: Request, res: Response) => {
    const { file } = req;
    console.log(file);
    const userId = req.user?.sub;
    const bucketName = process.env.MINIO_BUCKET;

    if (!file) return res.status(400).send('No file uploaded.');
    if (!bucketName) return res.status(500).send('Bucket name not found.');
    if (!userId) return res.status(401).send('User id not found. You may not be logged in.');

    const fileName = `${Date.now()}-${file.originalname}`;

    try {
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName);
        }
        await minioClient.putObject(bucketName, fileName, file.buffer, file.size, { 'Content-Type': file.mimetype });
        console.log(`File ${fileName} uploaded to MinIO.`);

        const fileMetadata = {
            filename: fileName,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            bucket: bucketName,
            uploadedBy: userId,
        };
        const newFile = new FileModel(fileMetadata);
        await newFile.save();
        console.log(`Metadata for ${fileName} saved to MongoDB.`);

        const documentToIndex = {
            id: newFile._id.toString(),
            originalName: newFile.originalName,
            mimetype: newFile.mimetype,
            createdAt: newFile.createdAt,
        };
        const meiliIndex = meiliClient.index('files');
        await meiliIndex.addDocuments([documentToIndex]);
        console.log(`Document ${newFile._id} indexed in Meilisearch.`);

        const publicUrl = `${process.env.MINIO_PUBLIC_URL}/${bucketName}/${fileName}`;

        res.status(200).json({
            message: 'File uploaded and indexed successfully!',
            fileId: newFile._id,
            filename: newFile.filename,
            url: publicUrl,
        });

    } catch (error) {
        console.error('An error occurred during the upload process:', error);
        res.status(500).send('Error processing file.');
    }
}

export const deleteFile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.sub;

    if (!mongoose.Types.ObjectId.isValid(id ?? "")) {
        return res.status(400).send('Invalid file ID format.');
    }

    try {
        const file = await FileModel.findById(id);

        if (!file) return res.status(404).send('File not found.');

        // Safety check: ensure strictly defined values before comparison
        if (userId && !file.uploadedBy.equals(userId) && userRole !== 'admin') {
            return res.status(401).send(`Not allowed to delete other people's file!`);
        }

        await minioClient.removeObject(file.bucket, file.filename);
        console.log(`File ${file.filename} deleted from MinIO bucket ${file.bucket}.`);

        const meiliIndex = meiliClient.index('files');
        await meiliIndex.deleteDocument(file._id.toString());
        console.log(`Document ${file._id} deleted from Meilisearch index.`);

        await FileModel.findByIdAndDelete(id);
        console.log(`Metadata for ${file.filename} deleted from MongoDB.`);

        res.status(200).json({ message: 'File deleted successfully.' });

    } catch (error) {
        console.error('Error during file deletion:', error);
        res.status(500).send('An error occurred while deleting the file.');
    }
}

export const getFiles = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).send('Unauthorized: User ID is missing.');
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    try {
        // FIX: Use 'any' or 'Record<string, any>' to avoid "FilterQuery not found" error
        // while still ensuring strict ObjectId types for the data.
        const query: Record<string, any> = {
            uploadedBy: new mongoose.Types.ObjectId(userId)
        };

        if (search) {
            query.originalName = { $regex: search, $options: 'i' };
        }

        const [filesFromDb, totalFiles] = await Promise.all([
            FileModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            FileModel.countDocuments(query)
        ]);

        const files = filesFromDb.map(file => ({
            ...file,
            url: constructPublicUrl(file)
        }));

        const totalPages = Math.ceil(totalFiles / limit);

        res.status(200).json({
            files,
            totalFiles,
            totalPages,
            currentPage: page,
        });

    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).send('An error occurred while fetching files.');
    }
}

export const getAllFiles = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    try {
        // FIX: Use 'Record<string, any>' to allow dynamic regex property
        const query: Record<string, any> = {};

        if (search) {
            query.originalName = { $regex: search, $options: 'i' };
        }

        const [filesFromDb, totalFiles] = await Promise.all([
            FileModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            FileModel.countDocuments(query)
        ]);

        const files = filesFromDb.map(file => ({
            ...file,
            url: constructPublicUrl(file)
        }));

        const totalPages = Math.ceil(totalFiles / limit);

        res.status(200).json({
            files,
            totalFiles,
            totalPages,
            currentPage: page,
        });

    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).send('An error occurred while fetching files.');
    }
}