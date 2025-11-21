import crypto from 'crypto';
import User from "../models/user.model.js";
import webpush from "web-push";

export function generateJobId(homeworkId: string, preferenceId: string): string {
    return crypto.createHash('sha256').update(`${homeworkId}-${preferenceId}`).digest('hex');
}

export async function sendSingleNotification(task: { userId: string, title: string, body: string }) {
    const { userId, title, body } = task;
    console.log(`[Notifier] Processing notification for user ${userId}`);

    const user = await User.findById(userId).select('pushSubscriptions').lean();

    if (user && user.pushSubscriptions && user.pushSubscriptions.length > 0) {
        console.log(`[Notifier]   - Sending PUSH to ${user.pushSubscriptions.length} device(s)...`);
        const payload = JSON.stringify({ title, body });

        const sendPromises = user.pushSubscriptions.map(sub =>
            webpush.sendNotification(sub as any, payload).catch(err => {
                console.error(err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`     - Stale subscription found. Removing.`);
                    return User.updateOne({ _id: user._id }, { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } });
                }
                console.error(`     - Push send error for user ${userId}:`, err.body);
            })
        );
        await Promise.all(sendPromises);
    } else {
        console.log(`[Notifier]   - No push subscriptions found for user ${userId}.`);
    }
}