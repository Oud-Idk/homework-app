import { Request, Response } from "express";
import Vote from "../../models/vote.model.js";
import { redisClient } from "../../services/redis.service.js";
import {handleServerError} from "../../utils/errors.helper.js";

export const handleVote = async (req: Request, res: Response) => {
    const { id: postId } = req.params;
    const userId = req.user?.sub;
    const { voteType } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const upvotesKey = `post:${postId}:upvotes`;
    const downvotesKey = `post:${postId}:downvotes`;

    try {
        if (voteType === 'none') {
            await Vote.deleteOne({ user: userId, post: postId as string });
        } else {
            await Vote.updateOne({ user: userId, post: postId as string }, { $set: { voteType } }, { upsert: true });
        }

        const tx = redisClient.multi();
        tx.srem(upvotesKey, userId).srem(downvotesKey, userId);
        if (voteType === 'up') tx.sadd(upvotesKey, userId);
        if (voteType === 'down') tx.sadd(downvotesKey, userId);
        await tx.exec();

        const [ups, downs] = await Promise.all([redisClient.scard(upvotesKey), redisClient.scard(downvotesKey)]);

        res.status(200).json({ upvotes: ups, downvotes: downs, score: ups - downs });
    } catch (error) {
        handleServerError(res, error, "handleVote");
    }
};