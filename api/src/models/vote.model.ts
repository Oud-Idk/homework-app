import { Schema, model, Document, InferSchemaType } from 'mongoose';

const VoteSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    voteType: {
        type: String,
        enum: ['up', 'down'] as const,
        required: true
    },
}, {
    timestamps: true,
});

VoteSchema.index({ user: 1, post: 1 }, { unique: true });

export type Vote = InferSchemaType<typeof VoteSchema>;
export interface VoteDocument extends Vote, Document {}

export default model<VoteDocument>('Vote', VoteSchema);