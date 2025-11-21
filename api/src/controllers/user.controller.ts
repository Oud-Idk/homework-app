import { Request, Response } from 'express';
import User from '../models/user.model.js';

/**
 * Gets a list of all users.
 * (Admin Only)
 */
export const getUsers = async (req: Request, res: Response) => {
    try {
        // We select only the fields we want to expose to the admin frontend
        const users = await User.find({}).select('name email image role').sort({ name: 1 });
        res.status(200).json(users);
    } catch (error) {
        console.error("CRASH IN getUsers:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Updates a specific user's role.
 * (Admin Only)
 */
export const updateUserRole = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role } = req.body;

    // 1. Basic Validation
    if (!['admin', 'member'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified.' });
    }

    // 2. Prevent an admin from demoting themselves
    if (req.user?.sub === userId) {
        return res.status(400).json({ message: 'Admins cannot change their own role.' });
    }

    try {
        // 3. Find and update the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.role = role;
        await user.save();

        res.status(200).json(user);
    } catch (error) {
        console.error("CRASH IN updateUserRole:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};