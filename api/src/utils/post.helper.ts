import mongoose, { Types } from 'mongoose';
import Post, { IPostDocument } from '../models/post.model.js';
import Vote from '../models/vote.model.js';
import { redisClient } from '../services/redis.service.js';
import { UserPayload } from "../middleware/auth.middleware.js";

// A reasonable time-to-live for vote caches in seconds (e.g., 1 hour)
const POST_VOTE_CACHE_TTL = 3600;

// --- Type Definitions for Clarity and Safety ---

export type PopulatedPost = Omit<IPostDocument, 'author' | 'homework'> & {
    author?: { _id: Types.ObjectId; name: string; email?: string } | null;
    homework?: { _id: Types.ObjectId; title: string } | null;
};

export class HttpError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

export type EnrichedPost = PopulatedPost & {
    upvotes: number;
    downvotes: number;
    score: number;
    userVote: 'up' | 'down' | null;
};

type LeanVote = {
    post: Types.ObjectId;
    user: Types.ObjectId;
    voteType: 'up' | 'down';
};

type VoteAggregateResult = {
    _id: Types.ObjectId;
    upvoters: Types.ObjectId[];
    downvoters: Types.ObjectId[];
};


/**
 * Enriches posts with vote counts using a cache-aside strategy.
 * This version correctly handles the tuple-based return type from redis.multi.exec().
 *
 * @param posts - An array of post objects from a .lean() query.
 * @param viewerId - The ID of the user viewing the posts.
 * @returns A promise that resolves to an array of enriched posts.
 */
export const enrichPostsWithVotes = async (
    posts: PopulatedPost[],
    viewerId?: string
): Promise<EnrichedPost[]> => {
    if (!posts || posts.length === 0) {
        return [];
    }

    const postIds = posts.map(p => p._id);
    const enrichedData = new Map<string, Partial<EnrichedPost>>();

    // --- Step 1: Concurrently fetch user's votes (DB) & check cache existence (Redis) ---

    const userVotesPromise = viewerId
        ? Vote.find({
            user: new mongoose.Types.ObjectId(viewerId),
            post: { $in: postIds }
        }).lean<LeanVote[]>()
        : Promise.resolve([]);

    const cacheExistencePipeline = redisClient.multi();
    postIds.forEach(id => cacheExistencePipeline.exists(`post:${id}:upvotes`));
    const cacheExistencePromise = cacheExistencePipeline.exec();

    const [userVotes, cacheExistenceResults] = await Promise.all([
        userVotesPromise,
        cacheExistencePromise
    ]);

    const userVotesMap = new Map(userVotes.map(vote => [vote.post.toString(), vote.voteType]));

    // --- Step 2: Segregate posts into cached and non-cached lists ---

    const postsWithCache: Types.ObjectId[] = [];
    const postsToRepopulate: Types.ObjectId[] = [];

    posts.forEach((post, index) => {
        // --- FIX: Access the SECOND element of the tuple [1] BEFORE casting ---
        const existenceTuple = cacheExistenceResults?.[index];
        // Check for command error (first element) and then get result (second element)
        const cacheExists = !existenceTuple?.[0] && (existenceTuple?.[1] as number) === 1;

        if (cacheExists) {
            postsWithCache.push(post._id);
        } else {
            postsToRepopulate.push(post._id);
        }
        enrichedData.set(post._id.toString(), {
            userVote: userVotesMap.get(post._id.toString()) || null,
        });
    });

    // --- Step 3: Process the two groups concurrently ---

    const processingPromises: Promise<void>[] = [];

    // 3a: Get counts for cached posts directly from Redis
    if (postsWithCache.length > 0) {
        const fetchCountsPromise = async () => {
            const redisMulti = redisClient.multi();
            postsWithCache.forEach(postId => {
                redisMulti.scard(`post:${postId}:upvotes`);
                redisMulti.scard(`post:${postId}:downvotes`);
            });
            const redisResults = await redisMulti.exec();

            postsWithCache.forEach((postId, index) => {
                const upvotesTuple = redisResults?.[index * 2];
                const downvotesTuple = redisResults?.[index * 2 + 1];

                // --- FIX: Access the SECOND element of the tuple [1] BEFORE casting ---
                // If the first element (error) is null, get the second element (result).
                const upvotes = !upvotesTuple?.[0] ? ((upvotesTuple?.[1] as number) || 0) : 0;
                const downvotes = !downvotesTuple?.[0] ? ((downvotesTuple?.[1] as number) || 0) : 0;

                enrichedData.set(postId.toString(), {
                    ...enrichedData.get(postId.toString()),
                    upvotes,
                    downvotes,
                });
            });
        };
        processingPromises.push(fetchCountsPromise());
    }

    // 3b: For non-cached posts, fetch from DB and warm the cache
    if (postsToRepopulate.length > 0) {
        const repopulatePromise = async () => {
            // This part remains correct as it doesn't interact with the problematic tuple
            const votesToRepopulate = await Vote.aggregate<VoteAggregateResult>([
                { $match: { post: { $in: postsToRepopulate } } },
                { $group: { _id: '$post', upvoters: { $push: { $cond: [{ $eq: ['$voteType', 'up'] }, '$user', '$$REMOVE'] } }, downvoters: { $push: { $cond: [{ $eq: ['$voteType', 'down'] }, '$user', '$$REMOVE'] } } } }
            ]);

            const repopulationMap = new Map(votesToRepopulate.map(v => [v._id.toString(), v]));
            const cacheWarmupPipeline = redisClient.multi();

            postsToRepopulate.forEach(postId => {
                const voteData = repopulationMap.get(postId.toString());
                const upvoters = voteData?.upvoters.map(String) || [];
                const downvoters = voteData?.downvoters.map(String) || [];

                enrichedData.set(postId.toString(), {
                    ...enrichedData.get(postId.toString()),
                    upvotes: upvoters.length,
                    downvotes: downvoters.length,
                });

                if (upvoters.length > 0) {
                    cacheWarmupPipeline.sadd(`post:${postId}:upvotes`, upvoters);
                }
                cacheWarmupPipeline.expire(`post:${postId}:upvotes`, POST_VOTE_CACHE_TTL);

                if (downvoters.length > 0) {
                    cacheWarmupPipeline.sadd(`post:${postId}:downvotes`, downvoters);
                }
                cacheWarmupPipeline.expire(`post:${postId}:downvotes`, POST_VOTE_CACHE_TTL);
            });

            await cacheWarmupPipeline.exec();
        };
        processingPromises.push(repopulatePromise());
    }

    await Promise.all(processingPromises);

    // --- Step 4: Combine original post data with the new enriched data ---

    return posts.map(post => {
        const data = enrichedData.get(post._id.toString()) || {};
        const upvotes = data.upvotes ?? 0;
        const downvotes = data.downvotes ?? 0;

        return {
            ...post,
            upvotes,
            downvotes,
            score: upvotes - downvotes,
            userVote: data.userVote || null,
        };
    });
};


/**
 * Finds a post by ID and verifies ownership or admin role. Throws HttpError on failure.
 */
export const findPostAndAuthorize = async (postId: string, user?: UserPayload): Promise<IPostDocument> => {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new HttpError("Invalid Post ID format", 400);
    }
    const post = await Post.findById(postId);

    if (!post) {
        throw new HttpError("Post not found", 404);
    }

    if (post.author?.toString() !== user?.sub && user?.role !== "admin") {
        throw new HttpError("Forbidden: You do not have permission to edit this post", 403);
    }

    return post;
};