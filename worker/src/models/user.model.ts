import { Schema, model, Document } from 'mongoose'; // <-- CORRECTED LINE
import type { InferSchemaType } from 'mongoose';

const NotificationPreferenceSchema = new Schema({
    daysBefore: {
        type: Number,
        required: true,
        min: 0,
    },
    timeOfDay: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // Simple regex for HH:MM
    }
}, { _id: true }); // Ensure each preference gets a unique _id

const PushSubscriptionSchema = new Schema({
    endpoint: String,
    keys: {
        p256dh: String,
        auth: String,
    },
}, { _id: false });

const ViewPreferencesSchema = new Schema({
    hideCompletedDays: {
        type: Number,
        required: true,
        default: 7 // Sensible default
    },
    hidePastDueDays: {
        type: Number,
        required: true,
        default: 30 // Sensible default
    }
}, { _id: false }); // No separate _id for this sub-document

const UserSchema = new Schema({
    name: String,
    email: { type: String, unique: true },
    image: String,
    emailVerified: Date,
    role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'member',
    },
    notificationPreferences: [NotificationPreferenceSchema],
    pushSubscriptions: [PushSubscriptionSchema],
    completedHomework: [{
        type: Schema.Types.ObjectId,
        ref: 'Homework'
    }],
    viewPreferences: {
        type: ViewPreferencesSchema,
        default: () => ({})
    }
});

export type IUser = InferSchemaType<typeof UserSchema>;

// This interface now correctly extends Mongoose's Document type
export interface UserDocument extends IUser, Document {}

export default model('User', UserSchema);