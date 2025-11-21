import mongoose, { InferSchemaType, Document } from "mongoose";

const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    bucket: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

export type IFile = InferSchemaType<typeof fileSchema>;
export interface IFileDocument extends IFile, Document {}

const FileModel = mongoose.model('File', fileSchema);

export default FileModel;