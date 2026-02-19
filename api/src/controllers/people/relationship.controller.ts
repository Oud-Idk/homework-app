import Relationship from "../../models/relationship.model.js";
import { Request, Response } from "express";
import { handleServerError } from "../../utils/errors.helper.js";
import mongoose from "mongoose";

const addRelationship = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.sub;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { classroomId, relationships } = req.body;

        const newRelationships = relationships
            .filter((rel: { targetId: string }) => rel.targetId !== userId.toString())
            .map((rel: { targetId: string; value: number }) => ({
                fromStudent: userId,
                toStudent: rel.targetId,
                classroom: classroomId,
                weight: rel.value
            }));

        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                await Relationship.deleteMany(
                    {
                        fromStudent: userId,
                        classroom: classroomId
                    },
                    { session }
                );

                if (newRelationships.length > 0) {
                    await Relationship.insertMany(newRelationships, { session });
                }
            });

            await session.endSession();

            return res.status(200).json({
                message: "Relationships saved successfully",
                count: newRelationships.length
            });

        } catch (transactionError) {
            await session.endSession();
            throw transactionError; // Re-throw to be caught by the outer catch block
        }

    } catch (error) {
        handleServerError(res, error, "addRelationship");
    }
}

const listRelationshipsOfUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.sub;
        const relationships = await Relationship.find({fromStudent: userId ?? ""})
            .populate('fromStudent')
            .populate('toStudent')
            .populate('classroom')
            .lean();

        res.status(200).json(relationships);
    } catch (error) {
        handleServerError(res, error, "listRelationships");
    }
}


const getRelationshipsByClass = async (req: Request, res: Response) => {
    try {
        const { classroomId } = req.params;

        const relationships = await Relationship.find({ classroom: classroomId as string })
            .populate('fromStudent', 'name email')
            .populate('toStudent', 'name email')
            .populate('classroom', 'name')
            .lean();

        res.status(200).json(relationships);
    } catch (error) {
        handleServerError(res, error, "getRelationshipsByClass");
    }
}

const updateRelationship = async (req: Request, res: Response) => {
    try {
        const { id, ...updateData } = req.body;
        const relationship = await Relationship.findByIdAndUpdate(
            id,
            updateData,
            { returnDocument: 'after', runValidators: true }
        ).populate('fromStudent toStudent classroom'); // Populate the updated document

        if (!relationship) {
            return res.status(404).json({ message: "Relationship not found" });
        }
        res.status(200).json(relationship);
    } catch (error) {
        handleServerError(res, error, "updateRelationship");
    }
}

const deleteRelationship = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        const relationship = await Relationship.findByIdAndDelete(id);

        if (!relationship) {
            return res.status(404).json({ message: "Relationship not found" });
        }

        res.status(200).json({ message: "Relationship deleted successfully" });
    } catch (error) {
        handleServerError(res, error, "deleteRelationship");
    }
}

export {
    addRelationship,
    listRelationshipsOfUser,
    getRelationshipsByClass,
    updateRelationship,
    deleteRelationship
};