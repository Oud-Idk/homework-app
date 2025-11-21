import { Request, Response } from 'express';
import { z } from 'zod';
import Homework from '../../models/homework.model.js';
import { redisClient } from '../../services/redis.service.js';
import { publishToQueue } from '../../services/rabbitmq.service.js';
import User from '../../models/user.model.js';
import Follow from '../../models/follow.model.js';
import mongoose, { Types } from "mongoose";
import { IHomework } from '../../models/homework.model.js';
import { IFollow } from '../../models/follow.model.js';
import { IUser } from '../../models/user.model.js';

const createHomeworkSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    dueDate: z.iso.datetime({ message: "Invalid date format" }),
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid groupId format" }),
});

const updateHomeworkSchema = createHomeworkSchema;

export const getHomeworks = async (req: Request, res: Response) => {
    try {
        let homeworkIdsToFetch: string[] = [];
        let userFollows: IFollow[] = [];
        let userCompleted: Types.ObjectId[] = [];

        if (req.user && req.user.sub) {
            // Manually cast the string ID from the token into a real ObjectId
            const userIdAsObjectId = new mongoose.Types.ObjectId(req.user.sub);

            // Fetch user data and follow data in parallel for performance
            const [user, follows] = await Promise.all([
                User.findById(userIdAsObjectId).select('completedHomework viewPreferences').lean<IUser>(),
                Follow.find({ user: userIdAsObjectId }).select('homework').lean<IFollow[]>()
            ]);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            userFollows = follows ?? []; // `follows` is already safe, but good practice
            userCompleted = user.completedHomework ?? []; // The critical fix
            const hidePastDueDays = user.viewPreferences?.hidePastDueDays ?? 0;

            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const pastDueCutoff = new Date(startOfToday);
            pastDueCutoff.setDate(startOfToday.getDate() - hidePastDueDays);

            const query = {
                dueDate: { $gte: pastDueCutoff }
            };
            const homeworks = await Homework.find(query).select('_id').sort({ dueDate: -1 }).limit(100).lean();
            homeworkIdsToFetch = homeworks.map(hw => hw._id.toString());
        } else {
            // Public logic for anonymous users
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const publicHomeworks = await Homework.find({ dueDate: { $gte: startOfToday } }).select('_id').sort({ dueDate: 1 }).limit(50).lean();
            homeworkIdsToFetch = publicHomeworks.map(hw => hw._id.toString());
        }

        if (homeworkIdsToFetch.length === 0) {
            return res.status(200).json([]);
        }

        const redisKeys = homeworkIdsToFetch.map(id => `homework:${id}`);
        const cachedResults = await redisClient.mget(redisKeys);

        const homeworksFromCache: IHomework[] = [];
        const missedIds: string[] = [];

        cachedResults.forEach((result, index) => {
            if (result) {
                homeworksFromCache.push(JSON.parse(result));
            } else {
                missedIds.push(homeworkIdsToFetch[index]!);
            }
        });

        let homeworksFromDb: IHomework[] = [];
        if (missedIds.length > 0) {
            homeworksFromDb = await Homework.find({ _id: { $in: missedIds } }).lean<IHomework[]>();
            const multi = redisClient.multi();
            homeworksFromDb.forEach(hw => {
                multi.set(`homework:${hw._id.toString()}`, JSON.stringify(hw), 'EX', 3600);
            });
            await multi.exec();
        }

        const allHomeworks = [...homeworksFromCache, ...homeworksFromDb];

        const completedIdsSet = new Set(userCompleted.map(id => id.toString()));
        const followedIdsSet = new Set(userFollows.map(f => f.homework.toString()));

        const finalResult = allHomeworks.map(hw => ({
            ...hw,
            completed: completedIdsSet.has(hw._id.toString()),
            isFollowing: followedIdsSet.has(hw._id.toString()),
        }));

        finalResult.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        res.status(200).json(finalResult);

    } catch (error) {
        console.error("CRASH IN getHomeworks:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createHomework = async (req: Request, res: Response) => {
    // 1. Validate incoming data
    const validationResult = createHomeworkSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json({
            message: 'Bad Request: Invalid data provided.',
            errors: z.treeifyError(validationResult.error),
        });
    }

    // 2. Perform logic
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized, user ID missing from token." });
        }

        const newHomeworkData = { ...validationResult.data, userId };
        const homework = new Homework(newHomeworkData);
        await homework.save();

        // 3. Publish events and invalidate cache
        const eventPayload = {
            action: 'create',
            payload: homework,
        };
        await redisClient.publish('homework-updates', JSON.stringify(eventPayload));
        publishToQueue('homework_created_queue', homework);
        await redisClient.set(`homework:${homework._id}`, JSON.stringify(homework), 'EX', 3600);

        res.status(201).json(homework);
    } catch (error) {
        console.error("CRASH IN createHomework:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteHomework = async (req: Request, res: Response) => {
    try {
        const homework = await Homework.findById(req.params.id);

        if (!homework) {
            return res.status(404).json({ message: 'Homework not found' });
        }

        await homework.deleteOne();

        // --- Events & Invalidation ---
        const eventPayload = {
            action: 'delete',
            payload: { id: req.params.id }, // Send back the ID of the deleted item
        };
        await redisClient.publish('homework-updates', JSON.stringify(eventPayload));
        await redisClient.set(`homework:${homework._id}`, JSON.stringify(homework), 'EX', 3600);

        const queue = 'homework_deleted_queue'; // The new queue
        const message = { homeworkId: req.params.id };

        publishToQueue(queue, message);

        res.status(200).json({ message: 'Homework deleted successfully' });
    } catch (error) {
        console.error("CRASH IN deleteHomework:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const toggleHomeworkCompletion = async (req: Request, res: Response) => {
    try {
        const homeworkId = req.params.id;
        const userId = req.user?.sub;
        const homework = await Homework.findById(homeworkId);

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findById(userId);
        const homeworkExists = await Homework.findById(homeworkId).countDocuments() > 0;

        if (!user || !homeworkExists || !homework) {
            return res.status(404).json({ message: 'User or Homework not found' });
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDate = new Date(homework.dueDate);
        const isPastDue = dueDate < startOfToday;

        if (isPastDue) {
            res.status(400).json({
                message: "Bad Request: You cannot change homework status after it's due!",
            })
            return
        }

        const isAlreadyCompleted = user.completedHomework.some(id => id.equals(homeworkId));
        let newCompletedStatus;

        if (isAlreadyCompleted) {
            await User.updateOne({ _id: userId }, { $pull: { completedHomework: homeworkId } });
            newCompletedStatus = false;
        } else {
            await User.updateOne({ _id: userId }, { $addToSet: { completedHomework: homeworkId } });
            newCompletedStatus = true;
        }

        await redisClient.del('homeworks:all'); // This cache key is no longer used in getHomeworks but good practice

        const eventPayload = {
            action: 'update',
            payload: {
                userId: userId, // Include the user who made the change
                homeworkId: homeworkId,
                completed: newCompletedStatus, // Send the new state
            }
        };
        await redisClient.publish("homework-updates", JSON.stringify(eventPayload));

        res.status(200).json({
            message: 'Status updated successfully',
            completed: newCompletedStatus
        });

    } catch (error) {
        console.error("CRASH IN toggleHomeworkCompletion:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateHomework = async (req: Request, res: Response) => {
    // 1. Validate incoming data
    const validationResult = updateHomeworkSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json({
            message: 'Bad Request: Invalid data provided.',
            errors: z.treeifyError(validationResult.error),
        });
    }

    try {
        const homework = await Homework.findById(req.params.id);

        if (!homework) {
            return res.status(404).json({ message: 'Homework not found' });
        }

        // 2. Update the document with new data
        homework.set(validationResult.data);
        await homework.save();

        // 3. Publish a full update event and invalidate cache
        const eventPayload = {
            action: 'full_update', // Use a distinct action name
            payload: homework,      // Send the entire updated object
        };
        await redisClient.publish('homework-updates', JSON.stringify(eventPayload));
        await redisClient.set(`homework:${homework._id}`, JSON.stringify(homework), 'EX', 3600);

        res.status(200).json(homework);
    } catch (error) {
        console.error("CRASH IN updateHomework:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};