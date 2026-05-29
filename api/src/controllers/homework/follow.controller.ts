import { Request, Response } from 'express';
import Follow from '../../models/follow.model.js';
import Homework from '../../models/homework.model.js';
import { handleServerError } from '../../utils/errors.helper.js';

export const followToHomework = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { id: homeworkId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const homeworkExists = await Homework.exists({ _id: homeworkId as string });
        if (!homeworkExists) {
            return res.status(404).json({ message: "Homework not found" });
        }

        const alreadyFollowing = await Follow.exists({ user: userId, homework: homeworkId as string });
        if (alreadyFollowing) {
            return res.status(409).json({ message: "Already following this homework" });
        }

        await Follow.create({
            user: userId as string,
            homework: homeworkId as string,
        });

        res.status(201).json({ message: 'Successfully followed' });

    } catch (error) {
        handleServerError(res, error, "followToHomework");
    }
};

export const unfollowFromHomework = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { id: homeworkId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const result = await Follow.findOneAndDelete({
            user: userId,
            homework: homeworkId as string,
        });

        if (!result) {
            return res.status(404).json({ message: "You are not following this homework" });
        }

        res.status(200).json({ message: 'Successfully unfollowed' });

    } catch (error) {
        handleServerError(res, error, "unfollowFromHomework");
    }
};