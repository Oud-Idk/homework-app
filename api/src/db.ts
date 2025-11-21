import mongoose from 'mongoose';
import ScheduledNotification from './models/scheduledNotificaton.model.js';

export const connectDB = async () => {
    try {
        console.log(`Using ${process.env.MONGO_URI}`)
        const conn = await mongoose.connect(process.env.MONGO_URI!);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log('Running startup cleanup for expired notifications...');
        ScheduledNotification.cleanupExpired();
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};