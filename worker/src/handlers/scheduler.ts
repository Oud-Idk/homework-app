import User from "../models/user.model.js";
import type { UserDocument } from "../models/user.model.js";

import ScheduledNotification from "../models/scheduleNotification.model.js";
import Homework from "../models/homework.model.js";
import type { HomeworkDocument,  IHomework } from "../models/homework.model.js"

import { generateJobId } from "../services/utils.js";

/**
 * The main scheduling logic.
 */
export async function scheduleNotificationsForHomework(homework: IHomework): Promise<void> {
    console.log(`[Scheduler] Processing homework: "${homework.title}"`);

    const user: UserDocument | null = await User.findById(homework.userId).select('notificationPreferences');

    if (!user || !user.notificationPreferences || user.notificationPreferences.length === 0) {
        console.log(`[Scheduler]   - User has no preferences. Skipping.`);
        return;
    }

    const dueDate = new Date(homework.dueDate);
    const dueDateTime = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 59).getTime();

    for (const pref of user.notificationPreferences) {
        const [hours, minutes] = pref.timeOfDay.split(':').map(Number);
        if (hours === undefined || minutes === undefined) {
            console.log(`[Scheduler]   - Invalid timeOfDay format: ${pref.timeOfDay}`);
            continue;
        }

        const notificationTime = new Date(dueDateTime);
        notificationTime.setDate(notificationTime.getDate() - pref.daysBefore);
        notificationTime.setHours(hours, minutes, 0, 0);

        const jobId = generateJobId(homework._id.toString(), pref._id!.toString());
        const isPastDue = notificationTime.getTime() - Date.now() < 0;

        if (!isPastDue) {
            await ScheduledNotification.updateOne(
                { jobId },
                {
                    jobId,
                    userId: user._id,
                    homeworkId: homework._id,
                    sendAt: notificationTime,
                    title: `Reminder: ${homework.title}`,
                    body: `Your homework "${homework.title}" is due soon.`
                },
                { upsert: true }
            );
            console.log(`[Scheduler]   - Saved job ${jobId.substring(0, 6)}... for ${notificationTime.toLocaleString()}`);
        } else {
            console.log(`[Scheduler]   - Skipped past-due alert for job ${jobId.substring(0, 6)}...`);
            await ScheduledNotification.deleteOne({ jobId });
        }
    }
}

/**
 * The re-scheduling logic.
 */
export async function rescheduleAllNotificationsForUser(userId: string): Promise<void> {
    console.log(`[Re-Scheduler] Received preference change for user: ${userId}`);

    await ScheduledNotification.deleteMany({ userId: userId, sendAt: { $gt: new Date() } });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeHomeworks: HomeworkDocument[] = await Homework.find({
        userId: userId,
        dueDate: { $gte: startOfToday }
    });
    console.log(`[Re-Scheduler]   - Found ${activeHomeworks.length} active homeworks to re-schedule.`);

    for (const hw of activeHomeworks) {
        await scheduleNotificationsForHomework(hw);
    }
    console.log(`[Re-Scheduler]   - Finished re-scheduling for user ${userId}.`);
}

/**
 * Cancels all notifications for a given homeworkId.
 */
export async function cancelNotificationsForHomework(homeworkId: string): Promise<void> {
    if (!homeworkId) {
        console.log('[Canceller] Received invalid homeworkId. Skipping.');
        return;
    }
    console.log(`[Canceller] Received deletion event for homework: ${homeworkId}`);
    const deleteResult = await ScheduledNotification.deleteMany({ homeworkId: homeworkId });
    console.log(`[Canceller]   - Cleared ${deleteResult.deletedCount} scheduled notifications from the ledger.`);
}