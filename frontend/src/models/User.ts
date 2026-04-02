import { Schema, models, model } from 'mongoose';

// This schema should match the one in your backend API
const UserSchema = new Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    image: String,
    role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'member',
    },
    // We can add a field to store the Google-specific ID
    googleId: { type: String, unique: true, sparse: true },
});

// The `models.User` check prevents Mongoose from recompiling the model on every hot-reload
const User = models.User || model('User', UserSchema);
export default User;