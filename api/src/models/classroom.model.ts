import mongoose, { InferSchemaType, Document } from "mongoose";
import {IFile} from "./file.model.js";

const classSchema = new mongoose.Schema({
    name: { type: String, required: true },
})

export type IClass = InferSchemaType<typeof classSchema>;
export interface IClassDocument extends IFile, Document {}

const Classroom = mongoose.model('Classroom', classSchema);

export default Classroom;