import { Request, Response } from "express";
import { z } from "zod";
import Vote from "../../models/vote.model.js";
import { redisClient } from "../../services/redis.service.js";

const voteSchema = z.object({
    voteType: z.enum(['up', 'down', 'none']),
});

export const handleVote = async (req: Request, res: Response) => {
    const {id: postId} = req.params;
    const userId = req.user?.sub;

    const validation = voteSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({errors: z.treeifyError(validation.error)});
    }

    if (!userId) {
        return res.status(401).json({message: "Unauthorized: User ID not found in token."});
    }

    if (!postId) {
        return res.status(400).json({message: "id not provided."});
    }

    const {voteType} = validation.data;

    const upvotesKey = `post:${postId}:upvotes`;
    const downvotesKey = `post:${postId}:downvotes`;

    try {
        if (voteType === 'none') {
            await Vote.deleteOne({user: userId, post: postId});
        } else {
            await Vote.updateOne(
                {user: userId, post: postId},
                {$set: {voteType: voteType}},
                {upsert: true}
            );
        }

        const writeTransaction = redisClient.multi();
        writeTransaction.srem(upvotesKey, userId);
        writeTransaction.srem(downvotesKey, userId);
        if (voteType === 'up') {
            writeTransaction.sadd(upvotesKey, userId);
        } else if (voteType === 'down') {
            writeTransaction.sadd(downvotesKey, userId);
        }
        await writeTransaction.exec();

        // Step 2: Perform all READ operations separately.
        // Promise.all runs these concurrently for maximum speed.
        const [newUpvoteCount, newDownvoteCount] = await Promise.all([
            redisClient.scard(upvotesKey),
            redisClient.scard(downvotesKey)
        ]);

        res.status(200).json({
            upvotes: newUpvoteCount,
            downvotes: newDownvoteCount,
            score: newUpvoteCount - newDownvoteCount
        });

    } catch (error) {
        console.error("CRASH IN handleVote:", error);
        res.status(500).json({message: "Server error"});
    }
};