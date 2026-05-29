import {Schema, model, InferSchemaType, Types, Document} from 'mongoose';

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
    }
}, {
    timestamps: true
});

JournalSchema.index({ author: 1, entryDate: 1 }, { unique: true });

export type IJournal = InferSchemaType<typeof JournalSchema> & {
    _id: Types.ObjectId;
};

export interface IJournalDocument extends IJournal, Document {
    _id: Types.ObjectId;
}

export default model<IJournalDocument>('Journal', JournalSchema);