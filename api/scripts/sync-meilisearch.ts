import mongoose from 'mongoose';
import Post from '../src/models/post.model.js';
import { meiliClient, initializeMeili } from '../src/services/meilisearch.service.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI;

/**
 * Helper function to poll the Meilisearch tasks API until a task is resolved.
 * This replaces the now-removed `waitForTask` method.
 * @param taskUid The UID of the task to wait for.
 */
const waitForTaskCompletion = async (taskUid: number): Promise<void> => {
    while (true) {
        const task = await meiliClient.tasks.getTask(taskUid);

        if (task.status === 'succeeded') {
            // Task is done, we can stop polling.
            return;
        }

        if (task.status === 'failed') {
            // Task failed, throw an error to stop the script.
            console.error('Meilisearch task failed:', task.error);
            throw new Error(`Meilisearch task ${taskUid} failed.`);
        }

        // If status is 'enqueued' or 'processing', wait a bit before checking again.
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
    }
};


async function run() {
    console.log('Connecting to MongoDB...');
    if (!MONGO_URI) {
        throw new Error("MONGO_URI is not defined in your .env file");
    }
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    try {
        await initializeMeili();

        console.log('Fetching all top-level posts from database...');
        const posts = await Post.find({ parent: null, isDeleted: false }).lean();

        if (posts.length === 0) {
            console.log('No posts found to index.');
            return;
        }

        const documents = posts.map(p => ({
            ...p,
            _id: p._id.toString(),
            author: p.author?.toString(),
            homework: p.homework?.toString(),
        }));

        console.log(`Found ${posts.length} posts. Indexing in Meilisearch...`);

        const index = meiliClient.index('posts');
        const taskResponse = await index.addDocuments(documents, { primaryKey: '_id' });

        console.log(`Meilisearch task queued with taskUid: ${taskResponse.taskUid}. Waiting for it to complete...`);

        // +++ THE CORRECT METHOD: Use our new polling helper function +++
        await waitForTaskCompletion(taskResponse.taskUid);

        console.log('Sync complete.');

    } catch (error) {
        console.error('Failed to sync posts:', error);
    } finally {
        // Ensure we always disconnect from the database
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

run().catch(console.error);