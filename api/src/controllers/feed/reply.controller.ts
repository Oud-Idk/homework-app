import { Request, Response } from "express";
import mongoose from "mongoose";
import Post, { IPostDocument } from "../../models/post.model.js";
import User from "../../models/user.model.js"; // You'll need to import User to query it directly
import Vote from "../../models/vote.model.js";
import { redisClient } from "../../services/redis.service.js";
import { handleServerError } from "../../utils/errors.helper.js";

export const createReply = async (req: Request, res: Response) => {
    const { id: parentId } = req.params;
    const { content } = req.body;
    const authorId = req.user?.sub;

    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const parentPost = await Post.findById(parentId);
        if (!parentPost) return res.status(404).json({ message: "Parent post not found." });

        const newReply = new Post({
            content,
            author: authorId,
            parent: parentId,
            depth: (parentPost.depth || 0) + 1,
            homework: parentPost.homework,
        });

        // Use a session for atomicity
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            await newReply.save({ session });
            await Post.updateOne({ _id: parentId }, { $inc: { replyCount: 1 } }, { session });
        });
        await session.endSession();

        await newReply.populate('author', 'name email');

        // Quick DTO creation
        const response = {
            ...newReply.toObject(),
            upvotes: 0,
            downvotes: 0,
            score: 0,
            userVote: null
        };

        res.status(201).json(response);
    } catch (error) {
        handleServerError(res, error, "createReply");
    }
};

export const getReplies = async (req: Request, res: Response) => {
    const { id: parentId } = req.params;
    const userId = req.user?.sub;

    try {
        const replies = await Post.find({ parent: parentId as string })
            .sort({ createdAt: 'asc' })
            .populate('author', 'name email')
            .lean<IPostDocument[]>();

        if (!replies.length) return res.status(200).json([]);

        // Attach external data (Redis + Votes)
        const enriched = await enrichPostsWithStats(replies, userId);

        res.status(200).json(enriched);
    } catch (error) {
        handleServerError(res, error, "getReplies");
    }
};

export const getReplyTree = async (req: Request, res: Response) => {
    const { id: startPostId } = req.params;
    const { depth } = req.query;
    const userId = req.user?.sub;
    const maxDepth = depth ? Number(depth) : 10;

    try {
        const pipeline: mongoose.PipelineStage[] = [
            { $match: { _id: new mongoose.Types.ObjectId(startPostId) } },
            {
                $graphLookup: {
                    from: 'posts',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'parent',
                    as: 'replies',
                    maxDepth: maxDepth - 1,
                    depthField: 'level',
                }
            }
        ];

        const results = await Post.aggregate(pipeline);
        if (!results.length) return res.status(404).json({ message: "Post not found." });

        const rootPost = results[0];
        const flatReplies = rootPost.replies as (IPostDocument & { level: number })[];

        if (!flatReplies.length) {
            return res.status(200).json(rootPost);
        }

        // 2. BATCH FETCH METADATA (The "Dataloader" pattern)
        // Extract all Author IDs from the fetched replies
        const authorIds = [...new Set(flatReplies.map(r => r.author?.toString()))];

        // Parallel Fetching: Get Users and Enrich Stats (Redis/Votes) at the same time
        const [authors, enrichedReplies] = await Promise.all([
            User.find({ _id: { $in: authorIds } }).select('name email').lean(),
            enrichPostsWithStats(flatReplies, userId)
        ]);

        // 3. EFFICIENT MAPPING (O(1) Lookup)
        const authorMap = new Map(authors.map(a => [a._id.toString(), a]));

        const finalReplies = enrichedReplies.map(reply => {
            const authorId = reply.author?.toString();
            return {
                ...reply,
                author: authorMap.get(authorId ?? "") || { _id: authorId, name: 'Unknown' }
            };
        });

        finalReplies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        rootPost.replies = finalReplies;

        await Post.populate(rootPost, { path: 'author', select: 'name email' });

        res.status(200).json(rootPost);

    } catch (error) {
        handleServerError(res, error, "getReplyTree");
    }
};

/**
 * Shared Helper: Takes an array of posts, fetches Redis scores and User votes,
 * and merges them.
 */
async function enrichPostsWithStats(posts: IPostDocument[], userId?: string) {
    if (!posts.length) return [];

    const postIds = posts.map(p => p._id.toString());
    const redisMulti = redisClient.multi();

    // Batch Redis Commands
    postIds.forEach(id => {
        redisMulti.scard(`post:${id}:upvotes`);
        redisMulti.scard(`post:${id}:downvotes`);
    });

    // Fetch User Votes if logged in
    const userVotesPromise = userId
        ? Vote.find({
            user: userId,
            post: { $in: postIds }
        }).select('post voteType').lean()
        : Promise.resolve([]);

    const [redisResults, userVotes] = await Promise.all([
        redisMulti.exec(),
        userVotesPromise
    ]);

    // Create a Map for O(1) vote lookup
    const userVoteMap = new Map();
    if (Array.isArray(userVotes)) {
        userVotes.forEach(v => userVoteMap.set(v.post.toString(), v.voteType));
    }

    // Merge Data
    return posts.map((post, index) => {
        // Redis returns [error, result] tuples
        const upTuple = redisResults?.[index * 2] as [Error | null, number];
        const downTuple = redisResults?.[index * 2 + 1] as [Error | null, number];

        const upvotes = upTuple?.[1] || 0;
        const downvotes = downTuple?.[1] || 0;

        return {
            ...post,
            upvotes,
            downvotes,
            score: upvotes - downvotes,
            userVote: userVoteMap.get(post._id.toString()) || null
        };
    });
}