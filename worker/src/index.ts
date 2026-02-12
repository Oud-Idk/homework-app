import 'dotenv/config';
import webpush from 'web-push';

import ScheduledNotification from './models/scheduleNotification.model.js';
import {
    cancelNotificationsForHomework,
    rescheduleAllNotificationsForUser,
    scheduleNotificationsForHomework
} from "./handlers/scheduler.js";
import { fanoutPostNotifications } from "./handlers/postNotifier.js";
import { sendSingleNotification } from "./services/utils.js";
import { connectToMongo } from "./services/mongoose.js";
import { connectToRabbitMQ, setupTopology } from "./services/rabbitmq.js";
import { setupVapid } from "./config/webpush.js";
import { QUEUES } from "./config/rabbitmq.js";
import type { Channel, ConsumeMessage } from "amqplib";
import type { IHomework } from "./models/homework.model.js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error("FATAL: VAPID keys are not configured. Push notifications will fail.");
    process.exit(1);
}
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
console.log("Web Push VAPID keys configured.");

async function checkDatabaseForDueNotifications(channel: Channel): Promise<void> {
    try {
        const now = new Date();
        const dueNotifications = await ScheduledNotification.find({ sendAt: { $lte: now } });

        if (dueNotifications.length > 0) {
            console.log(`[Poller] Found ${dueNotifications.length} due notification(s).`);
        }

        for (const notification of dueNotifications) {
            console.log(`[Poller] Processing job ${notification.jobId.substring(0, 6)}...`);

            const notificationPayload = {
                jobId: notification.jobId,
                userId: notification.userId,
                title: notification.title,
                body: notification.body,
            };

            channel.sendToQueue(
                QUEUES.HOMEWORK_DUE_NOTIFICATION,
                Buffer.from(JSON.stringify(notificationPayload))
            );

            await ScheduledNotification.findByIdAndDelete(notification._id);
        }
    } catch (error) {
        console.error('[Poller] Error polling for due notifications:', error);
    }
}

async function startWorker(): Promise<void> {
    const channel = await connectToRabbitMQ();

    await connectToMongo();
    await setupTopology(channel);
    setupVapid();

    void channel.prefetch(1);

    console.log(`[*] Worker is running. Waiting for messages. To exit press CTRL+C`);

    // setInterval(() => {
    //     checkDatabaseForDueNotifications(channel);
    // }, 10000);

    // channel.consume(QUEUES.HOMEWORK_CREATED, async (msg: ConsumeMessage | null) => {
    //     if (!msg) return;
    //     try {
    //         // Assert the type of the parsed JSON payload
    //         const homework: IHomework = JSON.parse(msg.content.toString());
    //         await scheduleNotificationsForHomework(homework);
    //     } catch (error) {
    //         console.error("Error in HOMEWORK_CREATED consumer:", error);
    //     }
    //     channel.ack(msg);
    // }).catch(e => {console.error(e)});

    // channel.consume(QUEUES.PREFERENCE_CHANGED, async (msg: ConsumeMessage | null) => {
    //     if (!msg) return;
    //     try {
    //         const { userId }: { userId: string } = JSON.parse(msg.content.toString());
    //         await rescheduleAllNotificationsForUser(userId);
    //     } catch (error) {
    //         console.error("Error in PREFERENCE_CHANGED consumer:", error);
    //     }
    //     channel.ack(msg);
    // }).catch(e => {console.error(e)});


    // channel.consume(QUEUES.HOMEWORK_DUE_NOTIFICATION, async (msg: ConsumeMessage | null) => {
    //     if (!msg) return;
    //     // Define an interface for the payload for clarity
    //     interface DueNotificationPayload {
    //         jobId: string;
    //         userId: string;
    //         title: string;
    //         body: string;
    //     }
    //     const notificationPayload: DueNotificationPayload = JSON.parse(msg.content.toString());
//
    //     try {
    //         console.log(`\n[Notifier] --- NOTIFICATION RECEIVED for job ${notificationPayload.jobId.substring(0, 6)}... ---`);
    //         await sendSingleNotification({
    //             userId: notificationPayload.userId,
    //             title: notificationPayload.title,
    //             body: notificationPayload.body,
    //         });
    //     } catch (error) {
    //         console.error("[Notifier] Error processing due notification:", error);
    //     }
    //     channel.ack(msg);
    // }).catch(e => {console.error(e)});

    // channel.consume(QUEUES.HOMEWORK_DELETED, async (msg) => {
    //     if (!msg) return;
    //     try {
    //         const { homeworkId } = JSON.parse(msg.content.toString());
    //         await cancelNotificationsForHomework(homeworkId);
    //     } catch (error) {
    //         console.error("Error in HOMEWORK_DELETED consumer:", error);
    //     }
    //     channel.ack(msg);
    // }).catch(e => {console.error(e)});

    // channel.consume(QUEUES.POST_FANOUT, async (msg) => {
    //     if (!msg) return;
    //     try {
    //         const postPayload = JSON.parse(msg.content.toString());
    //         await fanoutPostNotifications(postPayload, channel);
    //     } catch (error) {
    //         console.error("Error in POST_FANOUT consumer:", error);
    //     }
    //     channel.ack(msg);
    // }).catch(e => {console.error(e)});

    // channel.consume(QUEUES.POST_NOTIFICATION, async (msg) => {
    //     if (!msg) return;
    //     try {
    //         const task = JSON.parse(msg.content.toString());
    //         console.log("Sending post notification")
    //         await sendSingleNotification(task);
    //     } catch (error) {
    //         console.error("Error in POST_NOTIFICATION consumer:", error);
    //     }
    //     channel.ack(msg);
    // }).catch(e => {console.error(e)});

}

startWorker().catch(error => {
    console.error("FATAL: Worker failed to start.", error);
    process.exit(1);
});