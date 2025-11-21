import mongoose from "mongoose";
import Follow from "../models/follow.model.js";
import { QUEUES } from '../config/rabbitmq.js';
import amqp from "amqplib";

export async function fanoutPostNotifications(payload: {
    postId: string,
    homeworkId: string,
    authorId: string,
    title: string
}, channel: amqp.Channel) {
    const { homeworkId, authorId, title } = payload;
    console.log(`[Dispatcher] New post for "${title}". Fanning out notifications.`);

    const homeworkIdAsObjectId = new mongoose.Types.ObjectId(homeworkId);

    const follows = await Follow.find({ homework: homeworkIdAsObjectId }).select('user').lean();
    if (follows.length === 0) {
        console.log(`[Dispatcher]   - No followers. Task complete.`);
        return;
    }

    console.log(`[Dispatcher]   - Found ${follows.length} followers. Creating notification tasks.`);

    // Create a unique task for each follower
    for (const follow of follows) {
        const followerId = follow.user.toString();

        // Don't create a task for the author of the post
        if (followerId === authorId) {
            continue;
        }

        const notificationTask = {
            userId: followerId,
            title: `New Post in "${title}"`,
            body: `A new note or answer was just added.`,
        };

        // Publish the individual task to the work queue
        channel.sendToQueue(QUEUES.POST_NOTIFICATION, Buffer.from(JSON.stringify(notificationTask)), { persistent: true });
    }
}