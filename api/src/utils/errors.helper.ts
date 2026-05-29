import { Response } from 'express';

export const handleServerError = (res: Response, error: unknown, context: string) => {
    console.error(`CRASH IN ${context}:`, error);
    res.status(500).json({ message: 'Server Error' });
};