import { Request, Response } from 'express';
import { z } from 'zod';
import Post, { IPostDocument } from '../../models/post.model.js';
import Homework from '../../models/homework.model.js';
import Vote from '../../models/vote.model.js';
import mongoose from "mongoose";
import { redisClient } from '../../services/redis.service.js';
import { publishToExchange } from '../../services/rabbitmq.service.js';
import { meiliClient } from "../../services/meilisearch.service.js";
import { SearchParams } from "meilisearch";
import {
    enrichPostsWithVotes,
    findPostAndAuthorize,
    PopulatedPost
} from '../../utils/post.helper.js';

const EVENTS_EXCHANGE = 'events_exchange';
const POST_CREATED_ROUTING_KEY = 'post.created';

const createPostSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    content: z.string().min(1, { message: "Post content cannot be empty" }),
    homeworkId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

const updatePostSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }).optional(),
    content: z.string().min(1, { message: "Post content cannot be empty" }).optional(),
});

const handlePostCreationSideEffects = async (post: IPostDocument) => {
    const message = JSON.stringify({
        action: 'create',
        payload: { postId: post._id, title: post.title, authorId: post.author }
    });
    // This publish is safe
    await redisClient.publish('post-events', message);

    // Guard against undefined author and homework before using them
    if (post.homework && post.author) {
        const homeworkId = post.homework.toString();
        await redisClient.del(`posts:for-homework:${homeworkId}`);
        publishToExchange(EVENTS_EXCHANGE, POST_CREATED_ROUTING_KEY, {
            postId: post._id,
            homeworkId,
            authorId: post.author.toString(),
            // Provide a default for title if it's optional
            title: post.title ?? 'Untitled Post',
        });
    }
};


export const createPost = async (req: Request, res: Response) => {
    const authorId = req.user?.sub;
    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    const validation = createPostSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ errors: z.treeifyError(validation.error) });
    }

    const { content, homeworkId, title } = validation.data;

    try {
        if (homeworkId) {
            const homeworkExists = await Homework.exists({ _id: homeworkId });
            if (!homeworkExists) {
                return res.status(404).json({ message: "Homework not found" });
            }
        }

        const newPost = new Post({ content, author: authorId, title, homework: homeworkId });
        await newPost.save();

        await handlePostCreationSideEffects(newPost);

        await newPost.populate<{ author: { name: string, email: string }, homework: { title: string } }>([
            { path: 'author', select: 'name email' },
            { path: 'homework', select: 'title' }
        ]);

        // Convert the Mongoose Document to a plain object before enriching.
        const postObject = newPost.toObject() as unknown as PopulatedPost;
        const [enrichedPost] = await enrichPostsWithVotes([postObject], authorId);

        res.status(201).json(enrichedPost);

    } catch (error) {
        console.error("CRASH IN createPost:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getUserPosts = async (req: Request, res: Response) => {
    const { userId: targetUserId } = req.params;
    const viewerId = req.user?.sub;

    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const searchQuery = req.query.q as string || '';

        let postIds: mongoose.Types.ObjectId[];
        let totalPosts;

        if (searchQuery) {
            const index = meiliClient.index('posts');
            const searchResult = await index.search(searchQuery, {
                page,
                hitsPerPage: limit,
                filter: `author = ${targetUserId} AND parent IS NULL`
            });
            postIds = searchResult.hits.map(p => new mongoose.Types.ObjectId(p._id as string));
            totalPosts = searchResult.totalHits ?? 0;
        } else {
            const postsQuery = { author: new mongoose.Types.ObjectId(targetUserId), parent: null };
            totalPosts = await Post.countDocuments(postsQuery);
            const postsForIds = await Post.find(postsQuery)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select('_id')
                .lean();
            postIds = postsForIds.map(p => p._id);
        }

        if (postIds.length === 0) {
            return res.status(200).json({
                data: [],
                pagination: { total: totalPosts, page, limit, totalPages: Math.ceil(totalPosts / limit) }
            });
        }

        // --- TYPE CORRECTION USING .lean<T>() ---
        const postsFromDb = await Post.find({ '_id': { $in: postIds } })
            .populate('author', 'name')
            .populate('homework', 'title')
            .lean<PopulatedPost[]>(); // This provides the correct type to TypeScript

        const postsMap = new Map(postsFromDb.map(p => [p._id.toString(), p]));
        const posts = postIds.map(id => postsMap.get(id.toString())).filter((p): p is PopulatedPost => !!p);

        // --- REFACTORED: Use the helper for enrichment ---
        const enrichedPosts = await enrichPostsWithVotes(posts, viewerId);

        res.status(200).json({
            data: enrichedPosts,
            pagination: { total: totalPosts, page, limit, totalPages: Math.ceil(totalPosts / limit) }
        });

    } catch (error) {
        console.error("CRASH IN getUserPosts:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getHomeworkPost = async (req: Request, res: Response) => {
    const { homeworkId } = req.params;
    const cacheKey = `posts:for-homework:${homeworkId}`;

    try {
        const cachedPosts = await redisClient.get(cacheKey);
        if (cachedPosts) {
            console.log(`Serving posts for ${homeworkId} from CACHE`);
            return res.status(200).json(JSON.parse(cachedPosts));
        }

        console.log(`Serving posts for ${homeworkId} from DATABASE`);
        const posts = await Post.find({ homework: homeworkId })
            .sort({ createdAt: 'asc' })
            .populate('author', 'name email')
            .lean<PopulatedPost[]>();

        await redisClient.set(cacheKey, JSON.stringify(posts), 'EX', 600);
        res.status(200).json(posts);

    } catch (error) {
        console.error("CRASH IN getHomeworkPost:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAllPosts = async (req: Request, res: Response) => {
    try {
        const viewerId = req.user?.sub;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const searchQuery = req.query.q as string || '';

        const index = meiliClient.index('posts');
        const searchOptions: SearchParams = { page, hitsPerPage: limit, sort: ['createdAt:desc'], filter: 'parent IS NULL' };
        const searchResult = await index.search(searchQuery, searchOptions);

        const postIds = searchResult.hits.map(p => new mongoose.Types.ObjectId(p._id as string));
        const totalPosts = searchResult.estimatedTotalHits ?? 0;

        if (postIds.length === 0) {
            return res.status(200).json({
                data: [],
                pagination: { total: totalPosts, page, limit, totalPages: Math.ceil(totalPosts / limit) }
            });
        }

        // --- TYPE CORRECTION USING .lean<T>() ---
        const postsFromDb = await Post.find({ '_id': { $in: postIds } })
            .populate('author', 'name email')
            .populate('homework', 'title')
            .lean<PopulatedPost[]>();

        const postsMap = new Map(postsFromDb.map(p => [p._id.toString(), p]));
        const posts = postIds.map(id => postsMap.get(id.toString())).filter((p): p is PopulatedPost => !!p);

        // --- REFACTORED: Use the helper for enrichment ---
        const enrichedPosts = await enrichPostsWithVotes(posts, viewerId);

        const totalPages = Math.ceil(totalPosts / limit);
        res.status(200).json({
            data: enrichedPosts,
            pagination: { total: totalPosts, page, limit, totalPages }
        });

    } catch (error) {
        console.error("CRASH IN getAllPosts:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deletePost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    const authorId = req.user?.sub;
    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    if (!postId) {
        return res.status(400).json({ message: "Post ID parameter is required." });
    }

    try {
        const post = await findPostAndAuthorize(postId, req.user);

        if (post.parent) {
            post.isDeleted = true;
            post.content = "[deleted]";
            post.author = null;
            await post.save();
            return res.status(200).json(post.toObject());
        } else {
            const descendants = await Post.aggregate([
                { $match: { _id: post._id } },
                { $graphLookup: { from: 'posts', startWith: '$_id', connectFromField: '_id', connectToField: 'parent', as: 'descendants' } },
                { $project: { 'descendants._id': 1 } }
            ]);

            const descendantIds = descendants[0]?.descendants.map((d: { _id: mongoose.Types.ObjectId; }) => d._id) || [];
            const allIdsToDelete = [post._id, ...descendantIds];

            await Post.deleteMany({ _id: { $in: allIdsToDelete } });
            await Vote.deleteMany({ post: { $in: allIdsToDelete } });

            const redisKeysToDelete = allIdsToDelete.flatMap(id => [`post:${id}:upvotes`, `post:${id}:downvotes`]);
            if (redisKeysToDelete.length > 0) {
                await redisClient.del(redisKeysToDelete);
            }

            if (post.homework) {
                const cacheKey = `posts:for-homework:${post.homework.toString()}`;
                await redisClient.del(cacheKey);
            }
            return res.status(204).send();
        }
    } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            const customError = error as { statusCode: number; message: string };
            return res.status(customError.statusCode).json({ message: customError.message });
        }

        if (error instanceof Error) {
            console.error("CRASH IN deletePost:", error.message);
            return res.status(500).json({ message: "Server error" });
        }

        // Fallback for non-Error throws
        res.status(500).json({ message: "An unknown server error occurred" });
    }
};

export const updatePost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    const authorId = req.user?.sub;
    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    if (!postId) {
        return res.status(400).json({ message: "Post ID parameter is required." });
    }

    const validation = updatePostSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ errors: z.treeifyError(validation.error) });
    }

    try {
        const post = await findPostAndAuthorize(postId, req.user);

        const { title, content } = validation.data;
        if (title) {
            post.title = title;
        }
        if (content) {
            post.content = content;
        }
        await post.save();

        if (post.homework) {
            const cacheKey = `posts:for-homework:${post.homework.toString()}`;
            await redisClient.del(cacheKey);
        }

        // --- REFACTORED: Re-fetch as lean object to enrich for response ---
        const updatedPost = await Post.findById(post._id)
            .populate('author', 'name email')
            .populate('homework', 'title')
            .lean<PopulatedPost>();

        if (!updatedPost) {
            return res.status(404).json({ message: "Updated post could not be found." });
        }

        const [enrichedPost] = await enrichPostsWithVotes([updatedPost], authorId);

        res.status(200).json(enrichedPost);

    } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            const customError = error as { statusCode: number; message: string };
            return res.status(customError.statusCode).json({ message: customError.message });
        }

        if (error instanceof Error) {
            console.error("CRASH IN updatePost:", error.message);
            return res.status(500).json({ message: "Server error" });
        }

        // Fallback for non-Error throws
        res.status(500).json({ message: "An unknown server error occurred" });
    }
};