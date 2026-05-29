import * as Minio from 'minio';
import multer from 'multer';

if (
    !process.env.MINIO_ENDPOINT ||
    !process.env.MINIO_PORT ||
    !process.env.MINIO_ACCESS_KEY ||
    !process.env.MINIO_SECRET_KEY
) {
    throw Error("Minio keys not set!");
}

export const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT, 10),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});