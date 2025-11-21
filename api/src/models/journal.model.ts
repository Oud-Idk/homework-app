import { Schema, model, Document, InferSchemaType } from 'mongoose';

const ActivitySchema = new Schema({
    name: {
        type: String,
        required: [true, "Activity name is required."],
        trim: true,
        minlength: 1,
    },
    description: {
        type: String,
        required: false,
        trim: true,
    },
}, { _id: false });

const JournalSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    entryDate: {
        type: Date,
        required: true
    },
    activities: {
        type: [ActivitySchema],
        required: true,
        validate: [
            (val: Activity[]) => val.length > 0,
            'Journal must have at least one activity.'
        ]
    }
}, {
    timestamps: true
});

JournalSchema.index({ author: 1, entryDate: 1 }, { unique: true });

export type Activity = InferSchemaType<typeof ActivitySchema>;
export type Journal = InferSchemaType<typeof JournalSchema>;
export interface JournalDocument extends Journal, Document {}

export default model<JournalDocument>('Journal', JournalSchema);