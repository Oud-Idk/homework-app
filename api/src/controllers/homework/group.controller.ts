import type {Request, Response} from 'express';
import Group from '../../models/group.model.js';
import Homework from '../../models/homework.model.js';
import mongoose from "mongoose";

export const getGroups = async (req: Request, res: Response) => {
    try {
        const groups = await Group.find({});
        res.status(200).json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server Error'});
    }
};

export const createGroup = async (req: Request, res: Response) => {
    const {name, parentId} = req.body;
    if (!name) {
        return res.status(400).json({message: 'Group name is required'});
    }

    try {
        let path = name;
        if (parentId) {
            const parentGroup = await Group.findById(parentId);
            if (!parentGroup) {
                return res.status(404).json({message: 'Parent group not found'});
            }
            path = `${parentGroup.path}/${name}`;
        }

        const existingGroup = await Group.findOne({path});
        if (existingGroup) {
            return res.status(400).json({message: 'A group with this name/path already exists.'});
        }

        const newGroup = new Group({name, parent: parentId || null, path});
        await newGroup.save();
        res.status(201).json(newGroup);
    } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            const customError = error as { statusCode: number; message: string };
            return res.status(customError.statusCode).json({ message: customError.message });
        }

        if (error instanceof Error) {
            console.error("CRASH IN createGroup:", error.message);
            return res.status(500).json({ message: "Server error" });
        }

        // Fallback for non-Error throws
        res.status(500).json({ message: "An unknown server error occurred" });
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    const { groupId } = req.params;

    if (!groupId) {
        return res.status(400).json({ message: 'Group ID is required' });
    }

    try {
        // 1. Find the group that the user wants to delete
        const groupToDelete = await Group.findById(groupId);

        if (!groupToDelete) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const pathRegex = new RegExp(`^${groupToDelete.path}`);
        const allGroupsToDelete = await Group.find({ path: pathRegex });
        const allGroupIdsToDelete = allGroupsToDelete.map(g => g._id);

        if (allGroupIdsToDelete.length > 0) {
            await Homework.deleteMany({ group: { $in: allGroupIdsToDelete } });

            // 4. Delete the group and all its children
            await Group.deleteMany({ _id: { $in: allGroupIdsToDelete } });
        }

        res.status(200).json({ message: 'Group and all its children and associated homework were deleted successfully.' });

    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateGroup = async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { name: newName } = req.body;

    if (!newName) {
        return res.status(400).json({ message: 'New group name is required' });
    }

    // Use a transaction to ensure all path updates succeed or fail together
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const groupToUpdate = await Group.findById(groupId).session(session);
        if (!groupToUpdate) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Group not found' });
        }

        const oldPath = groupToUpdate.path;
        let newPath;

        if (groupToUpdate.parent) {
            const parent = await Group.findById(groupToUpdate.parent).session(session);
            if (!parent) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'Parent group not found during update' });
            }
            newPath = `${parent.path}/${newName}`;
        } else {
            newPath = newName;
        }

        // Check if a sibling with the same name already exists
        const existingGroup = await Group.findOne({ path: newPath }).session(session);
        if (existingGroup && existingGroup._id.toString() !== groupId) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'A group with this name already exists at this level.' });
        }

        // Find all children and grandchildren to update their paths
        const descendants = await Group.find({ path: { $regex: `^${oldPath}/` } }).session(session);

        // Update the original group
        groupToUpdate.name = newName;
        groupToUpdate.path = newPath;
        await groupToUpdate.save({ session });

        // Update all descendants' paths
        for (const descendant of descendants) {
            descendant.path = descendant.path.replace(oldPath, newPath);
            await descendant.save({ session });
        }

        await session.commitTransaction();
        res.status(200).json(groupToUpdate);

    } catch (error) {
        await session.abortTransaction();
        console.error('Error updating group:', error);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        session.endSession();
    }
};
