import { Schema, model, Document, InferSchemaType, Types } from 'mongoose';

const HomeworkSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
});

export type IHomework = InferSchemaType<typeof HomeworkSchema> & {
    _id: Types.ObjectId;
};
export interface IHomeworkDocument extends IHomework, Document {
    _id: Types.ObjectId;
}

export default model<IHomeworkDocument>('Homework', HomeworkSchema);