import { Request, Response } from 'express';
import Follow from '../../models/follow.model.js';
import Homework from '../../models/homework.model.js';

export const followToHomework = async (req: Request, res: Response) => {
    const { id: homeworkId } = req.params;
    const userId = req.user?.sub;

    try {
        // 1. First, make sure the homework actually exists
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

    try {
        // Find the specific follow and delete it
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