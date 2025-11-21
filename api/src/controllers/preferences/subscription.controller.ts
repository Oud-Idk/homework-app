import { Request, Response } from 'express';
import User from '../../models/user.model.js';

export const saveSubscription = async (req: Request, res: Response) => {
    try {
        const subscription = req.body;
        const userId = req.user?.sub;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Basic validation of the subscription object
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }

        // Use $addToSet to add the subscription only if it's not already in the array
        await User.updateOne(
            { _id: userId },
            { $addToSet: { pushSubscriptions: subscription } }
        );

        res.status(201).json({ message: 'Subscription saved successfully.' });
    } catch (error) {
        console.error("CRASH IN saveSubscription:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};