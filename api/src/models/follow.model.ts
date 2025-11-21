import { Schema, model, Document, InferSchemaType } from 'mongoose';

const FollowSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    homework: { type: Schema.Types.ObjectId, ref: 'Homework', required: true },
}, {
    timestamps: true,
});

FollowSchema.index({ user: 1, homework: 1 }, { unique: true });

export type IFollow = InferSchemaType<typeof FollowSchema>;
export interface FollowDocument extends IFollow, Document {}

export default model<FollowDocument>('Follow', FollowSchema);