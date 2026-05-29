import { Request, Response } from 'express';
import User from '../../models/user.model.js';
import { handleServerError } from "../../utils/errors.helper.js";

export const saveSubscription = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const subscription = req.body;

    try {
        await User.updateOne(
            { _id: userId },
            { $addToSet: { pushSubscriptions: subscription } }
        );

        res.status(201).json({ message: 'Subscription saved successfully.' });
    } catch (error) {
        handleServerError(res, error, "saveSubscription");
    }
};