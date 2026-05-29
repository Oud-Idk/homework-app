import { Request, Response } from 'express';
import Homework, { IHomework } from '../../models/homework.model.js';
import User, { IUser } from '../../models/user.model.js';
import Follow, { IFollow } from '../../models/follow.model.js';
import { redisClient } from '../../services/redis.service.js';
import { publishToQueue } from '../../services/rabbitmq.service.js';
import { handleServerError } from "../../utils/errors.helper.js";

export const getHomeworks = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.sub;
        let homeworkIdsToFetch: string[] = [];
        let completedIdsSet = new Set<string>();
        let followedIdsSet = new Set<string>();

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (userId) {
            // 1. Fetch User data and Follows in parallel
            const [user, follows] = await Promise.all([
                User.findById(userId).select('completedHomework viewPreferences').lean<IUser>(),
                Follow.find({ user: userId }).select('homework').lean<IFollow[]>()
            ]);

            if (!user) return res.status(404).json({ message: "User not found" });

            const hidePastDueDays = user.viewPreferences?.hidePastDueDays ?? 0;
            const pastDueCutoff = new Date(startOfToday);
            pastDueCutoff.setDate(startOfToday.getDate() - hidePastDueDays);

            // 2. Query visible IDs
            const homeworkDocs = await Homework.find({ dueDate: { $gte: pastDueCutoff } })
                .select('_id')
                .sort({ dueDate: -1 })
                .limit(100)
                .lean();

            homeworkIdsToFetch = homeworkDocs.map(hw => hw._id.toString());
            completedIdsSet = new Set((user.completedHomework || []).map(id => id.toString()));
            followedIdsSet = new Set((follows || []).map(f => f.homework.toString()));
        } else {
            // Anonymous users see everything from today onwards
            const publicHomeworks = await Homework.find({ dueDate: { $gte: startOfToday } })
                .select('_id')
                .sort({ dueDate: 1 })
                .limit(50)
                .lean();
            homeworkIdsToFetch = publicHomeworks.map(hw => hw._id.toString());
        }

        if (homeworkIdsToFetch.length === 0) return res.status(200).json([]);

        // 3. Cache Strategy: MGET
        const redisKeys = homeworkIdsToFetch.map(id => `homework:${id}`);
        const cachedResults = await redisClient.mget(redisKeys);

        const homeworksFromCache: IHomework[] = [];
        const missedIds: string[] = [];

        cachedResults.forEach((result, index) => {
            if (result) {
                homeworksFromCache.push(JSON.parse(result));
            } else {
                missedIds.push(homeworkIdsToFetch[index] as string);
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

        const finalResult = [...homeworksFromCache, ...homeworksFromDb].map(hw => ({
            ...hw,
            completed: completedIdsSet.has(hw._id.toString()),
            isFollowing: followedIdsSet.has(hw._id.toString()),
        }));

        finalResult.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        res.status(200).json(finalResult);
    } catch (error) {
        handleServerError(res, error, "getHomeworks");
    }
};

export const createHomework = async (req: Request, res: Response) => {
    const userId = req.user?.sub;

    try {
        const homework = await Homework.create({ ...req.body, userId: userId });

        await redisClient.publish('homework-updates', JSON.stringify({ action: 'create', payload: homework }));
        publishToQueue('homework_created_queue', homework);
        await redisClient.set(`homework:${homework._id}`, JSON.stringify(homework), 'EX', 3600);

        res.status(201).json(homework);
    } catch (error) {
        handleServerError(res, error, "createHomework");
    }
};

export const deleteHomework = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const homework = await Homework.findByIdAndDelete(id);
        if (!homework) return res.status(404).json({ message: 'Homework not found' });

        // Invalidate Cache & Events
        await redisClient.del(`homework:${id}`);
        await redisClient.publish('homework-updates', JSON.stringify({ action: 'delete', payload: { id } }));
        publishToQueue('homework_deleted_queue', { homeworkId: id });

        res.status(200).json({ message: 'Homework deleted successfully' });
    } catch (error) {
        handleServerError(res, error, "deleteHomework");
    }
};

export const toggleHomeworkCompletion = async (req: Request, res: Response) => {
    const { id: homeworkId } = req.params;
    const userId = req.user?.sub;

    try {
        const [user, homework] = await Promise.all([
            User.findById(userId),
            Homework.findById(homeworkId).select('dueDate')
        ]);

        if (!user || !homework) {
            return res.status(404).json({ message: 'User or Homework not found' });
        }

        // Logic check: Cannot toggle past-due items
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        if (new Date(homework.dueDate).getTime() < startOfToday) {
            return res.status(400).json({ message: "Cannot change status of past-due homework" });
        }

        const isAlreadyCompleted = user.completedHomework.some(id => id.equals(homeworkId));

        // Atomic Update
        if (isAlreadyCompleted) {
            await User.updateOne({ _id: userId }, { $pull: { completedHomework: homeworkId } });
        } else {
            await User.updateOne({ _id: userId }, { $addToSet: { completedHomework: homeworkId } });
        }

        const newStatus = !isAlreadyCompleted;

        // Notify
        await redisClient.publish("homework-updates", JSON.stringify({
            action: 'update_completion',
            payload: { userId, homeworkId, completed: newStatus }
        }));

        res.status(200).json({ message: 'Status updated', completed: newStatus });
    } catch (error) {
        handleServerError(res, error, "toggleHomeworkCompletion");
    }
};

export const updateHomework = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const homework = await Homework.findByIdAndUpdate(
            id,
            { $set: req.body },
            { returnDocument: 'after', runValidators: true }
        );

        if (!homework) return res.status(404).json({ message: 'Homework not found' });

        await redisClient.set(`homework:${id}`, JSON.stringify(homework), 'EX', 3600);
        await redisClient.publish('homework-updates', JSON.stringify({
            action: 'full_update',
            payload: homework
        }));

        res.status(200).json(homework);
    } catch (error) {
        handleServerError(res, error, "updateHomework");
    }
};