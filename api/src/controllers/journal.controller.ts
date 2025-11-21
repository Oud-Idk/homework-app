import { Request, Response } from 'express';
import { z } from 'zod';
import Journal from '../models/journal.model.js';
import mongoose from 'mongoose';
import { redisClient } from "../services/redis.service.js";

/**
 * Zod schema for validating the body of a journal upsert request.
 */
const journalUpsertSchema = z.object({
    date: z.coerce.date({
        error: 'A valid date string (e.g., YYYY-MM-DD) is required.',
    }),
    activities: z.array(z.object({
        name: z.string().min(1, { message: "Activity name cannot be empty." }),
        description: z.string().optional(),

    })).min(1, { message: "You must provide at least one activity." }),
});

type JournalActivities = z.infer<typeof journalUpsertSchema>['activities'];

const normalizeDateToUTCStart = (date: Date): Date => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

export const upsertJournalEntry = async (req: Request, res: Response) => {
    const authorId = req.user?.sub;
    if (!authorId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const validation = journalUpsertSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ errors: z.treeifyError(validation.error) });
    }

    const { date, activities } = validation.data;
    const normalizedDate = normalizeDateToUTCStart(date);

    try {
        const journalEntry = await Journal.findOneAndUpdate(
            { author: new mongoose.Types.ObjectId(authorId), entryDate: normalizedDate },
            { $set: { activities, author: authorId, entryDate: normalizedDate } },
            {
                upsert: true,
                new: true,
                runValidators: true,
                populate: { path: 'author', select: 'name email' },
            }
        );

        // A simple way to check if it was created or updated
        const wasJustCreated = journalEntry.createdAt?.getTime() === journalEntry.updatedAt?.getTime();
        const statusCode = wasJustCreated ? 201 : 200;

        if (wasJustCreated) {
            try {
                const message = JSON.stringify({
                    action: 'create',
                    payload: journalEntry
                });
                await redisClient.publish('journal-events', message);
                console.log("Published journal_create event to Redis.");
            } catch (redisError) {
                console.error("Failed to publish journal event to Redis:", redisError);
            }
        }

        res.status(statusCode).json(journalEntry);

    } catch (error) {
        console.error("CRASH IN upsertJournalEntry:", error);
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Server error" });
    }
};

export const updateJournalEntry = async (req: Request, res: Response) => {
    const authorId = req.user?.sub;
    if (!authorId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "?id is requited." });

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid journal ID format." });
    }

    // Use the same Zod schema, but make the fields partial as not all are sent
    const validation = journalUpsertSchema.partial().safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ errors: z.treeifyError(validation.error) });
    }

    const { date, activities } = validation.data;

    // Normalize date if it was provided
    const updateData: { activities?: JournalActivities; entryDate?: Date } = {};
    if (activities) updateData.activities = activities;
    if (date) updateData.entryDate = normalizeDateToUTCStart(date);

    try {
        const updatedJournal = await Journal.findOneAndUpdate(
            // Find by _id AND ensure the author matches, for security
            { _id: new mongoose.Types.ObjectId(id), author: new mongoose.Types.ObjectId(authorId) },
            { $set: updateData },
            {
                new: true, // Return the updated document
                runValidators: true,
                populate: { path: 'author', select: 'name email' },
            }
        );

        if (!updatedJournal) {
            return res.status(404).json({ message: "Journal entry not found or you do not have permission to edit it." });
        }

        res.status(200).json(updatedJournal);

    } catch (error) {
        console.error("CRASH IN updateJournalEntry:", error);
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Server error" });
    }
};

export const getAllJournals = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const skip = (page - 1) * limit;

        // Extract filter params
        const { date, before, after } = req.query;

        // Build the Mongoose Query Object
        const query: any = {};

        // 1. Exact Date Match (takes precedence or acts alone)
        // We need to find entries from 00:00:00 to 23:59:59 of that specific UTC date
        if (date) {
            const targetDate = new Date(date as string);
            if (!isNaN(targetDate.getTime())) {
                const startOfDay = new Date(targetDate);
                startOfDay.setUTCHours(0, 0, 0, 0);

                const endOfDay = new Date(targetDate);
                endOfDay.setUTCHours(23, 59, 59, 999);

                query.entryDate = {
                    $gte: startOfDay,
                    $lte: endOfDay
                };
            }
        }
        // 2. Range Filtering (After/Before) - Only runs if exact 'date' isn't provided
        else {
            const dateQuery: any = {};

            if (after) {
                const afterDate = new Date(after as string);
                if (!isNaN(afterDate.getTime())) {
                    // Reset to start of day to be inclusive
                    afterDate.setUTCHours(0, 0, 0, 0);
                    dateQuery.$gte = afterDate;
                }
            }

            if (before) {
                const beforeDate = new Date(before as string);
                if (!isNaN(beforeDate.getTime())) {
                    // Set to end of day to be inclusive
                    beforeDate.setUTCHours(23, 59, 59, 999);
                    dateQuery.$lte = beforeDate;
                }
            }

            if (Object.keys(dateQuery).length > 0) {
                query.entryDate = dateQuery;
            }
        }

        const [totalJournals, journals] = await Promise.all([
            Journal.countDocuments(query),
            Journal.find(query)
                .sort({ entryDate: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'name email')
        ]);

        const totalPages = Math.ceil(totalJournals / limit);

        res.status(200).json({
            data: journals,
            currentPage: page,
            totalPages,
            totalJournals,
        });

    } catch (error) {
        console.error("CRASH IN getAllJournals:", error);
        res.status(500).json({ message: "Server error" });
    }
};



export const deleteJournalEntry = async (req: Request, res: Response) => {
    const authorId = req.user?.sub;
    if (!authorId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "?id is requited." });

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid journal ID format." });
    }

    try {
        const deletedEntry = await Journal.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id)
        });

        // If findOneAndDelete returns null, it means no document was found
        if (!deletedEntry) {
            return res.status(404).json({ message: "Journal entry not found." });
        }

        // Successfully found and deleted the entry
        res.status(200).json({
            message: "Journal entry deleted successfully.",
        });

    } catch (error) {
        console.error("CRASH IN deleteJournalEntry:", error);
        res.status(500).json({ message: "Server error" });
    }
};