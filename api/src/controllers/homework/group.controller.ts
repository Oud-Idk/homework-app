import { Request, Response } from 'express';
import mongoose from "mongoose";
import Group from '../../models/group.model.js';
import Homework from '../../models/homework.model.js';
import { handleServerError } from '../../utils/errors.helper.js';

interface HttpError {
    statusCode: number;
    message: string;
}

function isHttpError(error: unknown): error is HttpError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        'message' in error
    );
}

export const getGroups = async (req: Request, res: Response) => {
    try {
        // .lean() makes query faster by returning POJOs instead of Mongoose Docs
        const groups = await Group.find({}).sort({ path: 1 }).lean();
        res.status(200).json(groups);
    } catch (error) {
        handleServerError(res, error, "getGroups");
    }
};

export const createGroup = async (req: Request, res: Response) => {
    // Validated by Middleware
    const { name, parentId } = req.body;

    try {
        let path = name;

        // 1. Calculate Path
        if (parentId) {
            const parentGroup = await Group.findById(parentId).select('path');
            if (!parentGroup) {
                return res.status(404).json({ message: 'Parent group not found' });
            }
            path = `${parentGroup.path}/${name}`;
        }

        // 2. Check Uniqueness
        // Using .exists() is faster than finding the whole doc
        const groupExists = await Group.exists({ path });
        if (groupExists) {
            return res.status(409).json({ message: 'A group with this name/path already exists.' });
        }

        // 3. Create
        const newGroup = await Group.create({
            name,
            parent: parentId || null,
            path
        });

        res.status(201).json(newGroup);

    } catch (error) {
        handleServerError(res, error, "createGroup");
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    const { groupId } = req.params;

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const groupToDelete = await Group.findById(groupId).session(session);
            if (!groupToDelete) {
                throw { statusCode: 404, message: 'Group not found' };
            }

            const pathRegex = new RegExp(`^${groupToDelete.path}`);

            // Find all affected Group IDs first
            const groupsToDelete = await Group.find({ path: pathRegex }).select('_id').session(session);
            const groupIds = groupsToDelete.map(g => g._id);

            if (groupIds.length > 0) {
                // Delete all homeworks associated with these groups
                await Homework.deleteMany({ group: { $in: groupIds } }).session(session);

                // Delete the groups themselves
                await Group.deleteMany({ _id: { $in: groupIds } }).session(session);
            }
        });

        res.status(200).json({ message: 'Group and descendants deleted successfully.' });

    } catch (error) {
        if (isHttpError(error) && error.statusCode === 404) {
           return res.status(404).json({ message: error.message });
        }
        handleServerError(res, error, "deleteGroup");
    } finally {
        await session.endSession();
    }
};

export const updateGroup = async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { name: newName } = req.body;

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            // 1. Fetch Target Group
            const groupToUpdate = await Group.findById(groupId).session(session);
            if (!groupToUpdate) throw { statusCode: 404, message: 'Group not found' };

            const oldPath = groupToUpdate.path;

            // 2. Calculate New Path
            let newPath = newName as string;
            if (groupToUpdate.parent) {
                const parent = await Group.findById(groupToUpdate.parent).session(session);
                if (!parent) throw { statusCode: 404, message: 'Parent group missing' };
                newPath = `${parent.path}/${newName}`;
            }

            const conflict = await Group.exists({ path: newPath, _id: { $ne: groupId as string } }).session(session);
            if (conflict) throw { statusCode: 409, message: 'Group name conflict.' };

            // 4. Update Target Group
            groupToUpdate.name = newName;
            groupToUpdate.path = newPath;
            await groupToUpdate.save({ session });

            const descendants = await Group.find({ path: { $regex: `^${oldPath}/` } }).session(session);

            if (descendants.length > 0) {
                const bulkOps = descendants.map(descendant => {
                    const updatedDescendantPath = descendant.path.replace(oldPath, newPath);
                    return {
                        updateOne: {
                            filter: { _id: descendant._id },
                            update: { $set: { path: updatedDescendantPath } }
                        }
                    };
                });

                await Group.bulkWrite(bulkOps, { session });
            }
        });

        // Fetch fresh copy to return
        const updated = await Group.findById(groupId).lean();
        res.status(200).json(updated);

    } catch (error) {
        if (isHttpError(error) && error.statusCode === 404) {
            return res.status(404).json({ message: error.message });
        }
        handleServerError(res, error, "updateGroup");
    } finally {
        await session.endSession();
    }
};