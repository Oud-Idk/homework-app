import { Request, Response } from 'express';
import User from '../../models/user.model.js';
import {publishToQueue} from "../../services/rabbitmq.service.js";

export const getAllPreferences = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.sub;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(userId)
            .select('notificationPreferences viewPreferences pushSubscriptions')
            .lean(); // Use .lean() for better performance on read-only queries

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            notificationPreferences: user.notificationPreferences || [],
            viewPreferences: user.viewPreferences,
            pushSubscriptions: user.pushSubscriptions || [] // Default to empty array if missing
        });

    } catch (error) {
        console.error("Error in getAllPreferences:", error); // Good to log server errors
        res.status(500).json({ message: "Server Error" });
    }
};


export const updateViewPreferences = async (req: Request, res: Response) => {
    const { hideCompletedDays, hidePastDueDays } = req.body;

    // Basic validation
    if (typeof hideCompletedDays !== 'number' || typeof hidePastDueDays !== 'number') {
        return res.status(400).json({ message: 'Invalid view preference data' });
    }

    try {
        const user = await User.findById(req.user!.sub);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Mongoose will create the object if it doesn't exist due to the schema default
        user.viewPreferences.hideCompletedDays = hideCompletedDays;
        user.viewPreferences.hidePastDueDays = hidePastDueDays;

        await user.save();
        res.status(200).json(user.viewPreferences);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const addNotificationPreference  = async (req: Request, res: Response) => {
    const { daysBefore, timeOfDay } = req.body;

    // Basic validation
    if (typeof daysBefore !== 'number' || !timeOfDay) {
        return res.status(400).json({ message: 'Invalid preference data' });
    }

    try {
        const user = await User.findById(req.user!.sub);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newPreference = { daysBefore: req.body.daysBefore, timeOfDay: req.body.timeOfDay };
        user.notificationPreferences.push(newPreference);
        await user.save();

        const createdPref = user.notificationPreferences[user.notificationPreferences.length - 1];

        // --- PUBLISH EVENT ---
        const eventPayload = { userId: user._id, preference: createdPref };
        publishToQueue('preference_changed_queue', eventPayload);
        console.log("Published 'preference.added' event");

        res.status(201).json(createdPref);
    } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            const customError = error as { statusCode: number; message: string };
            return res.status(customError.statusCode).json({ message: customError.message });
        }

        if (error instanceof Error) {
            console.error("CRASH IN addNotificationPreferences:", error.message);
            return res.status(500).json({ message: "Server error" });
        }

        // Fallback for non-Error throws
        res.status(500).json({ message: "An unknown server error occurred" });
    }
};

// Delete a preference for the current user by its ID
export const deleteNotificationPreference  = async (req: Request, res: Response) => {
    const { preferenceId } = req.params;

    try {
        const user = await User.findById(req.user!.sub);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!preferenceId) {
            return res.status(400).json({ message: 'Invalid preference data' });
        }

        const preferenceToDelete = user.notificationPreferences.id(preferenceId);
        if (!preferenceToDelete) {
            return res.status(404).json({ message: "Preference not found" });
        }

        user.notificationPreferences.pull({ _id: preferenceId });
        await user.save();

        // --- PUBLISH EVENT ---
        const eventPayload = { userId: user._id, preference: preferenceToDelete };
        publishToQueue('preference_changed_queue', eventPayload);
        console.log("Published 'preference.deleted' event");

        res.status(200).json({ message: 'Preference deleted' });
    } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            const customError = error as { statusCode: number; message: string };
            return res.status(customError.statusCode).json({ message: customError.message });
        }

        if (error instanceof Error) {
            console.error("CRASH IN deleteNotificationPreferences:", error.message);
            return res.status(500).json({ message: "Server error" });
        }

        // Fallback for non-Error throws
        res.status(500).json({ message: "An unknown server error occurred" });
    }
};