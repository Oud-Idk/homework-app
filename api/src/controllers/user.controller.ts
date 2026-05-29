import { Request, Response } from 'express';
import User from '../models/user.model.js';
import { handleServerError } from '../utils/errors.helper.js';

/**
 * Gets a list of all users.
 */
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({})
            .select('name email image role')
            .sort({ name: 1 })
            .lean(); // Faster performance for read-only admin lists

        res.status(200).json(users);
    } catch (error) {
        handleServerError(res, error, "getUsers");
    }
};

/**
 * Updates a specific user's role.
 */
export const updateUserRole = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (req.user?.sub === userId) {
        return res.status(400).json({ message: 'Admins cannot change their own role.' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { role } },
            { returnDocument: 'after', runValidators: true }
        ).select('name email role');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json(user);
    } catch (error) {
        handleServerError(res, error, "updateUserRole");
    }
};