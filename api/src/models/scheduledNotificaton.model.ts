import { Schema, model, Model, InferSchemaType } from 'mongoose';

const ScheduledNotificationSchema = new Schema({
    jobId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    homeworkId: { type: Schema.Types.ObjectId, ref: 'Homework', required: true, index: true },
    sendAt: { type: Date, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
});


type ScheduledNotification = InferSchemaType<typeof ScheduledNotificationSchema>;

export interface IScheduledNotificationModel extends Model<ScheduledNotification> {
    cleanupExpired(): Promise<{ acknowledged: boolean; deletedCount: number; }>;
}

/**
 * @description Finds and removes all scheduled notifications where the sendAt time is in the past.
 * @returns {Promise<object>} The result from the deleteMany operation.
 */
ScheduledNotificationSchema.statics.cleanupExpired = async function(): Promise<object> {
    try {
        const now = new Date();
        const result = await this.deleteMany({ sendAt: { $lt: now } });

        if (result.deletedCount > 0) {
            console.log(`Successfully cleaned up ${result.deletedCount} expired notifications.`);
        } else {
            console.log('No expired notifications to clean up.');
        }

        return result;
    } catch (error) {
        console.error('Error cleaning up expired notifications:', error);
        throw error;
    }
};


const ScheduledNotification = model<ScheduledNotification, IScheduledNotificationModel>(
    'ScheduledNotification',
    ScheduledNotificationSchema
);

export default ScheduledNotification;