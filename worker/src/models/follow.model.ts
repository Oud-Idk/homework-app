import { Schema, model, Document } from 'mongoose';

interface IFollow extends Document {
    user: Schema.Types.ObjectId;
    homework: Schema.Types.ObjectId;
}

const FollowSchema = new Schema<IFollow>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    homework: { type: Schema.Types.ObjectId, ref: 'Homework', required: true },
}, {
    timestamps: true,
});

FollowSchema.index({ user: 1, homework: 1 }, { unique: true });

export default model<IFollow>('Follow', FollowSchema);