import Classroom from "../../models/classroom.model.js";
import User from "../../models/user.model.js";
import { Request, Response } from "express";
import { classParamsSchema, updateClassSchema, deleteClassSchema } from "../../schemas/app.schemas.js";
import { handleServerError } from "../../utils/errors.helper.js";

const addClass = async (req: Request, res: Response) => {
    try {
        const { name } = classParamsSchema.parse(req.body);
        const classroom = await Classroom.create({ name });
        res.status(201).json(classroom);
    } catch (error) {
        handleServerError(res, error, "addClass");
    }
}

const listClass = async (req: Request, res: Response) => {
    try {
        const classes = await Classroom.find({});
        res.status(200).json(classes);
    } catch (error) {
        handleServerError(res, error, "listClass");
    }
}

const updateClass = async (req: Request, res: Response) => {
    try {
        const { id, ...updateData } = updateClassSchema.parse(req.body);

        const classroom = await Classroom.findByIdAndUpdate(
            id,
            { name: updateData.name },
            { returnDocument: 'after', runValidators: true }
        );

        if (!classroom) {
            return res.status(404).json({ message: "Classroom not found" });
        }
        res.status(200).json(classroom);
    } catch (error) {
        handleServerError(res, error, "updateClass");
    }
}

const deleteClass = async (req: Request, res: Response) => {
    try {
        const { id } = deleteClassSchema.parse(req.body);

        const classroom = await Classroom.findByIdAndDelete(id);

        if (!classroom) {
            return res.status(404).json({ message: "Classroom not found" });
        }

        await User.updateMany({ classroomId: id }, { $set: { classroomId: null } });

        res.status(200).json({ message: "Classroom deleted and students unlinked" });
    } catch (error) {
        handleServerError(res, error, "deleteClass");
    }
}

const listStudentInClass = async (req: Request, res: Response) => {
    try {
        const { classroomId } = req.params;

        // Verify class exists first
        const classroomExists = await Classroom.exists({ _id: classroomId });
        if (!classroomExists) {
            return res.status(404).json({ message: "Classroom not found" });
        }

        // Find all users who have this classroomId
        const students = await User.find({ classroomId: classroomId as string })
            .select("name email image role gender")
            .sort({ name: 1 })
            .lean();

        res.status(200).json(students);
    } catch (error) {
        handleServerError(res, error, "listStudentInClass");
    }
}

export { addClass, listClass, updateClass, deleteClass, listStudentInClass };