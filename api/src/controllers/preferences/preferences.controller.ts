import { Request, Response } from 'express';
import User from '../../models/user.model.js';
import { publishToQueue } from "../../services/rabbitmq.service.js";
import { handleServerError } from "../../utils/errors.helper.js";

export const getAllPreferences = async (req: Request, res: Response) => {
    const userId = req.user?.sub;

    try {
        const user = await User.findById(userId)
            .select('notificationPreferences viewPreferences pushSubscriptions classroomId gender')
            .lean();

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({
            notificationPreferences: user.notificationPreferences || [],
            viewPreferences: user.viewPreferences,
            pushSubscriptions: user.pushSubscriptions || [],
            classroomId: user.classroomId,
            gender: user.gender,
        });
    } catch (error) {
        handleServerError(res, error, "getAllPreferences");
    }
};

export const updateViewPreferences = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { hidePastDueDays } = req.body;

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { "viewPreferences.hidePastDueDays": hidePastDueDays } },
            { returnDocument: 'after', runValidators: true }
        ).select('viewPreferences');

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user.viewPreferences);
    } catch (error) {
        handleServerError(res, error, "updateViewPreferences");
    }
};

export const updateClassroom = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { classroomId } = req.params;

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { "classroomId": classroomId as string } },
            { returnDocument: 'after', runValidators: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user.classroomId);
    } catch (error) {
        handleServerError(res, error, "updateClassroom");
    }
}

export const updateGenderPreferences = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { gender } = req.params;

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { "gender": gender ?? '' } },
            { returnDocument: 'after' },
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user.gender);
    } catch (error) {
        handleServerError(res, error, "updateGeneralPreferences");
    }
}

export const addNotificationPreference = async (req: Request, res: Response) => {
    const userId = req.user?.sub;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Push new subdocument
        user.notificationPreferences.push(req.body);
        await user.save();

        const createdPref = user.notificationPreferences[user.notificationPreferences.length - 1];

        // RabbitMQ Sync
        publishToQueue('preference_changed_queue', {
            userId: user._id,
            action: 'ADDED',
            preference: createdPref
        });

        res.status(201).json(createdPref);
    } catch (error) {
        handleServerError(res, error, "addNotificationPreference");
    }
};

export const deleteNotificationPreference = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { preferenceId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const preferenceToDelete = user.notificationPreferences.id(preferenceId as string);
        if (!preferenceToDelete) {
            return res.status(404).json({ message: "Preference not found" });
        }

        user.notificationPreferences.pull({ _id: preferenceId });
        await user.save();

        publishToQueue('preference_changed_queue', {
            userId: user._id,
            action: 'DELETED',
            preference: preferenceToDelete
        });

        res.status(200).json({ message: 'Preference deleted' });
    } catch (error) {
        handleServerError(res, error, "deleteNotificationPreference");
    }
};