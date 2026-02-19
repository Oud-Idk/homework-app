import mongoose, { InferSchemaType, Document, Schema } from "mongoose";

const RelationshipSchema = new mongoose.Schema({
    fromStudent: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    toStudent: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        validate: {
            validator: function (this: { fromStudent: mongoose.Types.ObjectId }, value: mongoose.Types.ObjectId) {
                return !value.equals(this.fromStudent);
            },
            message: 'fromStudent and toStudent cannot be the same Student.'
        }
    },
    classroom: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Classroom'
    },
    weight: {
        type: Number,
        required: true
    },
});

RelationshipSchema.index({ classroom: 1, fromStudent: 1, toStudent: 1 }, { unique: true });

export type IRelationship = InferSchemaType<typeof RelationshipSchema>;
export interface IRelationshipDocument extends IRelationship, Document {}

const Relationships = mongoose.model('Relationship', RelationshipSchema);

export default Relationships;

/*
Inseparable +1,000
Great Vibes +20
Good Company +5
Neutral 0
Prefer Space -50
The Nuclear Option -10,000
*/