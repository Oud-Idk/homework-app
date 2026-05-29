import { Request, Response } from 'express';
import Journal, { IJournal, IJournalDocument } from '../models/journal.model.js';
import { redisClient } from "../services/redis.service.js";
import { handleServerError } from "../utils/errors.helper.js";
import mongoose, { QueryFilter } from "mongoose";
import { journalSchema } from "../schemas/app.schemas.js";

const normalizeToUTC = (date: Date) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

export const upsertJournalEntry = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { date, activities } = req.body;
    const entryDate = normalizeToUTC(date);

    try {
        const journalEntry = await Journal.findOneAndUpdate(
            { author: userId as string, entryDate },
            { $set: { activities, author: userId, entryDate } },
            {
                upsert: true,
                returnDocument: 'after',
                runValidators: true,
                populate: { path: 'author', select: 'name email' },
            }
        );

        // Check if created or updated
        const wasCreated = journalEntry.createdAt.getTime() === journalEntry.updatedAt.getTime();

        if (wasCreated) {
            await redisClient.publish('journal-events', JSON.stringify({
                action: 'create',
                payload: journalEntry
            })).catch(err => console.error("Redis Pub Error:", err));
        }

        res.status(wasCreated ? 201 : 200).json(journalEntry);
    } catch (error) {
        handleServerError(res, error, "upsertJournalEntry");
    }
};

export const updateJournalEntry = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { id } = req.params;
    const { date, activities } = req.body;

    try {
        const updateData: QueryFilter<IJournal> = {};
        if (activities) updateData.activities = activities;
        if (date) updateData.entryDate = normalizeToUTC(date);

        const updatedJournal = await Journal.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), author: userId as string }, // Security: Must be owner
            { $set: updateData },
            { returnDocument: 'after', runValidators: true, populate: { path: 'author', select: 'name email' } }
        );

        if (!updatedJournal) {
            return res.status(404).json({ message: "Journal entry not found or unauthorized." });
        }

        res.status(200).json(updatedJournal);
    } catch (error) {
        handleServerError(res, error, "updateJournalEntry");
    }
};

export const getAllJournals = async (req: Request, res: Response) => {
    // Validated by paginationSchema
    const { page, limit, date, before, after } = journalSchema.parse(req.query);
    const skip = (page - 1) * limit;

    try {
        const query: QueryFilter<IJournalDocument> = {};

        // Date logic
        if (date) {
            const start = normalizeToUTC(new Date(date));
            const end = new Date(start);
            end.setUTCHours(23, 59, 59, 999);
            query.entryDate = { $gte: start, $lte: end };
        } else if (before || after) {
            query.entryDate = {};
            if (after) query.entryDate.$gte = normalizeToUTC(new Date(after));
            if (before) {
                const endBefore = new Date(before);
                endBefore.setUTCHours(23, 59, 59, 999);
                query.entryDate.$lte = endBefore;
            }
        }

        const [total, journals] = await Promise.all([
            Journal.countDocuments(query),
            Journal.find(query)
                .sort({ entryDate: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'name email')
                .lean()
        ]);

        res.status(200).json({
            data: journals,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        });
    } catch (error) {
        handleServerError(res, error, "getAllJournals");
    }
};

export const deleteJournalEntry = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    const { id } = req.params;

    try {
        // Security: Ensure the user deleting is the owner
        const deletedEntry = await Journal.findOneAndDelete({ _id: id as string, author: userId as string });

        if (!deletedEntry) {
            return res.status(404).json({ message: "Journal entry not found or unauthorized." });
        }

        res.status(200).json({ message: "Journal entry deleted successfully." });
    } catch (error) {
        handleServerError(res, error, "deleteJournalEntry");
    }
};