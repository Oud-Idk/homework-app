import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from "mongoose";
import Post, { IPostDocument } from '../../models/post.model.js';
import Homework from '../../models/homework.model.js';
import Vote from '../../models/vote.model.js';
import { redisClient } from '../../services/redis.service.js';
import { publishToExchange } from '../../services/rabbitmq.service.js';
import { meiliClient } from "../../services/meilisearch.service.js";
import {
    enrichPostsWithVotes, enrichPostWithVotes,
    findPostAndAuthorize,
    PopulatedPost
} from '../../utils/post.helper.js';
import { paginationSchema } from "../../schemas/app.schemas.js";
import { handleServerError } from "../../utils/errors.helper.js";

const EVENTS_EXCHANGE = 'events_exchange';
const POST_CREATED_ROUTING_KEY = 'post.created';

const handlePostCreationSideEffects = async (post: IPostDocument) => {
    const message = JSON.stringify({
        action: 'create',
        payload: { postId: post._id, title: post.title, authorId: post.author }
    });
    await redisClient.publish('post-events', message);

    if (post.homework && post.author) {
        const homeworkId = post.homework.toString();
        await redisClient.del(`posts:for-homework:${homeworkId}`);
        publishToExchange(EVENTS_EXCHANGE, POST_CREATED_ROUTING_KEY, {
            postId: post._id,
            homeworkId,
            authorId: post.author.toString(),
            title: post.title ?? 'Untitled Post',
        });
    }
};

export const createPost = async (req: Request, res: Response) => {
    const authorId = req.user?.sub;
    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    const { content, homeworkId, title } = req.body;

    try {
        if (homeworkId) {
            const homeworkExists = await Homework.exists({ _id: homeworkId });
            if (!homeworkExists) return res.status(404).json({ message: "Homework not found" });
        }

        const newPost = new Post({ content, author: authorId, title, homework: homeworkId });
        await newPost.save();
        await handlePostCreationSideEffects(newPost);

        await newPost.populate([{ path: 'author', select: 'name email' }, { path: 'homework', select: 'title' }]);
        const [enrichedPost] = await enrichPostsWithVotes([newPost.toObject() as unknown as PopulatedPost], authorId);

        res.status(201).json(enrichedPost);
    } catch (error) {
        handleServerError(res, error, "createPost");
    }
};

export const getUserPosts = async (req: Request, res: Response) => {
    const { userId: targetUserId } = req.params;
    const viewerId = req.user?.sub;

    const { page, limit, q: searchQuery } = req.query as unknown as z.infer<typeof paginationSchema>;

    try {
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

        const postsFromDb = await Post.find({ '_id': { $in: postIds } })
            .populate('author', 'name')
            .populate('homework', 'title')
            .lean<PopulatedPost[]>();

        const enrichedPosts = await enrichPostsWithVotes(postsFromDb, viewerId);

        res.status(200).json({
            data: enrichedPosts,
            pagination: { total: totalPosts, page, limit, totalPages: Math.ceil(totalPosts / limit) }
        });

    } catch (error) {
        handleServerError(res, error, "getUserPosts");
    }
};

export const getHomeworkPost = async (req: Request, res: Response) => {
    const { homeworkId } = req.params;
    const cacheKey = `posts:for-homework:${homeworkId}`;

    try {
        const cachedPosts = await redisClient.get(cacheKey);
        if (cachedPosts) {
            return res.status(200).json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find({ homework: new mongoose.Types.ObjectId(homeworkId) })
            .sort({ createdAt: 'asc' })
            .populate('author', 'name email')
            .lean<PopulatedPost[]>();

        await redisClient.set(cacheKey, JSON.stringify(posts), 'EX', 600);
        res.status(200).json(posts);

    } catch (error) {
        handleServerError(res, error, "getHomeworkPost");
    }
};

export const getAllPosts = async (req: Request, res: Response) => {
    const { page, limit, q: searchQuery } = paginationSchema.parse(req.query);
    const viewerId = req.user?.sub;

    try {
        const index = meiliClient.index('posts');

        const searchResult = await index.search(searchQuery || '', {
            page,
            hitsPerPage: limit,
            sort: ['createdAt:desc'],
            filter: 'parent IS NULL'
        });

        const postIds = searchResult.hits.map(p => new mongoose.Types.ObjectId(p._id as string));
        const totalPosts = searchResult.totalHits ?? 0;

        if (postIds.length === 0) {
            return res.status(200).json({
                data: [],
                pagination: { total: 0, page, limit, totalPages: 0 }
            });
        }

        const postsFromDb = await Post.find({ '_id': { $in: postIds } })
            .populate('author', 'name email')
            .populate('homework', 'title')
            .lean<PopulatedPost[]>();

        const enrichedPosts = await enrichPostsWithVotes(postsFromDb, viewerId);

        res.status(200).json({
            data: enrichedPosts,
            pagination: {
                total: totalPosts,
                page,
                limit,
                totalPages: searchResult.totalPages ?? Math.ceil(totalPosts / limit)
            }
        });
    } catch (error) {
        handleServerError(res, error, "getAllPosts");
    }
};

export const getPost = async (req: Request, res: Response) => {
    try {
        const viewerId = req.user?.sub;
        const { postId } = req.params;

        const postFromDb = await Post.find({ '_id': postId })
            .populate('author', 'name email')
            .populate('homework', 'title')
            .lean<PopulatedPost[]>();

        if (postFromDb.length <= 0) {
            return res.status(404).json({ message: "Post not found." });
        }

        const enrichedPost = await enrichPostWithVotes(postFromDb[0], viewerId);

        res.status(200).json({ data: enrichedPost });

    } catch (error) {
        handleServerError(res, error, "getPost");
    }
};

export const deletePost = async (req: Request, res: Response) => {
    const { postId } = req.params;

    const authorId = req.user?.sub;
    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const post = await findPostAndAuthorize(postId as string, req.user);

        if (post.parent) {
            // Soft delete for replies
            post.isDeleted = true;
            post.content = "[deleted]";
            post.author = null;
            await post.save();
            return res.status(200).json(post.toObject());
        } else {
            // Hard delete for top-level posts
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
        handleServerError(res, error, "deletePost");
    }
};

export const updatePost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    const { title, content } = req.body;

    const authorId = req.user?.sub;
    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const post = await findPostAndAuthorize(postId as string, req.user);

        if (title) post.title = title;
        if (content) post.content = content;

        await post.save();

        if (post.homework) {
            const cacheKey = `posts:for-homework:${post.homework.toString()}`;
            await redisClient.del(cacheKey);
        }

        const updatedPost = await Post.findById(post._id)
            .populate('author', 'name email')
            .populate('homework', 'title')
            .lean<PopulatedPost>();

        if (!updatedPost) return res.status(404).json({ message: "Updated post could not be found." });

        const [enrichedPost] = await enrichPostsWithVotes([updatedPost], authorId);

        res.status(200).json(enrichedPost);

    } catch (error) {
        handleServerError(res, error, "updatePost");
    }
};