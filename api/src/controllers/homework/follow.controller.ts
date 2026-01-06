import { Request, Response } from 'express';
import Follow from '../../models/follow.model.js';
import Homework from '../../models/homework.model.js';

export const followToHomework = async (req: Request, res: Response) => {
    const { id: homeworkId } = req.params;
    const userId = req.user?.sub;

    // FIX 1: Explicitly check if user is authenticated
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // FIX 2: Ensure homeworkId exists
    if (!homeworkId) {
        return res.status(400).json({ message: "Homework ID is required" });
    }

    try {
        // 1. First, make sure the homework actually exists
        // Note: .findById accepts a string, countDocuments returns a Promise<number>
        const homeworkExists = await Homework.findById(homeworkId).countDocuments();

        if (!homeworkExists) {
            return res.status(404).json({ message: "Homework not found" });
        }

        // 2. Create the follows
        const newFollow = new Follow({
            user: userId,
            homework: homeworkId,
        });
        await newFollow.save();

        res.status(201).json({ message: 'Successfully followed' });

    } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            const customError = error as { statusCode: number; message: string };
            return res.status(customError.statusCode).json({ message: customError.message });
        }

        if (error instanceof Error) {
            console.error("CRASH IN followToHomework:", error.message);
            return res.status(500).json({ message: "Server error" });
        }

        // Fallback for non-Error throws
        res.status(500).json({ message: "An unknown server error occurred" });
    }
};

export const unfollowFromHomework = async (req: Request, res: Response) => {
    const { id: homeworkId } = req.params;
    const userId = req.user?.sub;

    // FIX 3: Guard against undefined userId.
    // This tells TypeScript that below this line, 'userId' is a string, not 'string | undefined'.
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!homeworkId) {
        return res.status(400).json({ message: "Homework ID is required" });
    }

    try {
        // Find the specific follow and delete it
        // Now passing { user: string, homework: string }, which satisfies the Mongoose types
        const result = await Follow.findOneAndDelete({
            user: userId,
            homework: homeworkId,
        });

        // If nothing was deleted, the follow didn't exist in the first place
        if (!result) {
            return res.status(404).json({ message: "Follows not found" });
        }

        res.status(200).json({ message: 'Successfully unfollowed' });

    } catch (error) {
        console.error("CRASH IN unfollowFromHomework:", error);
        res.status(500).json({ message: 'Server error' });
    }
};