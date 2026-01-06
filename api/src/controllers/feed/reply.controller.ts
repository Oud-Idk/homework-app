import { Request, Response } from "express";
import mongoose from "mongoose";
import Post, { IPost, IPostDocument } from "../../models/post.model.js";
import { redisClient } from "../../services/redis.service.js";
import Vote from "../../models/vote.model.js";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
    user?: { sub?: string };
    params: { id: string };
    query: { depth?: string };
}

type AggregatedReply = IPostDocument & {
    level: number;
    author: { _id: string; name: string /* ...other user fields */ };
    userVote: 'up' | 'down' | null;
    score?: number; // It's added later, so make it optional
};

const createReplySchema = z.object({
    content: z.string().min(1, {message: "Reply content cannot be empty"}),
});

export const createReply = async (req: Request, res: Response) => {
    const {id: parentId} = req.params;
    const authorId = req.user?.sub;

    const validation = createReplySchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({errors: validation.error.flatten().fieldErrors});
    }

    try {
        const parentPost = await Post.findById(parentId);
        if (!parentPost) {
            return res.status(404).json({message: "Parent post not found."});
        }

        const parentDepth = parentPost.depth ?? 0;
        const parentReplyCount = parentPost.replyCount ?? 0;

        const newReply = new Post({
            content: validation.data.content,
            author: authorId,
            parent: parentId,
            depth: parentDepth + 1, // Increment the nesting level
            homework: parentPost.homework, // Inherit the homework context
        });

        // 3. Use a transaction to save the reply AND update the parent's replyCount atomically
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            await newReply.save({session});
            parentPost.replyCount = parentReplyCount + 1;
            await parentPost.save({session});
        });
        await session.endSession();

        // 4. Populate author details before sending back to the UI
        await newReply.populate('author', 'name email');

        const responseObj: IPost & Required<{
            _id: unknown
        }> & {
            __v: number
        } & {
            upvotes?: number;
            downvotes?: number;
            score?: number;
            userVote?: null;
        } = newReply.toObject(); // sketchy

        // Manually add the properties the frontend expects for a new post
        responseObj.upvotes = 0;
        responseObj.downvotes = 0;
        responseObj.score = 0;
        responseObj.userVote = null; // The creator hasn't voted on their own reply yet

        res.status(201).json(responseObj);

    } catch (error) {
        console.error("CRASH IN createReply:", error);
        res.status(500).json({message: 'Server error'});
    }
};
export const getReplies = async (req: Request, res: Response) => {
    const {id: parentId} = req.params;
    const userId = req.user?.sub;

    if (!parentId) {
        return res.status(400).json({ message: "No id found." });
    }

    try {
        const replies = await Post.find({parent: parentId})
            .sort({createdAt: 'asc'})
            .populate('author', 'name email')
            .lean();


        if (replies.length === 0) {
            return res.status(200).json([]);
        }

        const replyIds = replies.map(r => r._id.toString());

        const redisMulti = redisClient.multi();
        replyIds.forEach(replyId => {
            redisMulti.scard(`post:${replyId}:upvotes`);
            redisMulti.scard(`post:${replyId}:downvotes`);
        });

        const userVotesPromise = userId
            ? Vote.find({
                user: new mongoose.Types.ObjectId(userId),
                post: {$in: replyIds.map(id => new mongoose.Types.ObjectId(id))}
            }).lean()
            : Promise.resolve([]);

        const [redisResults, userVotes] = await Promise.all([
            redisMulti.exec(),
            userVotesPromise
        ]);

        const userVotesMap = new Map(userVotes.map(vote => [vote.post.toString(), vote.voteType]));

        const enrichedReplies = replies.map((reply, index) => {
            const upvotesTuple = redisResults?.[index * 2];
            const downvotesTuple = redisResults?.[index * 2 + 1];

            const upvotes = upvotesTuple?.[1] as number || 0;
            const downvotes = downvotesTuple?.[1] as number || 0;
            const userVote = userVotesMap.get(reply._id.toString()) || null;

            return {
                ...reply,
                upvotes,
                downvotes,
                score: upvotes - downvotes,
                userVote: userVote as 'up' | 'down' | null,
            };
        });
        // --- END ENRICHMENT ---

        res.status(200).json(enrichedReplies);

    } catch (error) {
        console.error("CRASH IN getReplies:", error);
        res.status(500).json({message: 'Server error'});
    }
};
export const getReplyTree = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {id: startPostId} = req.params;
        if (!mongoose.Types.ObjectId.isValid(startPostId)) {
            return res.status(400).json({message: "Invalid Post ID."});
        }

        const userId = req.user?.sub;
        const maxDepth = Math.min(parseInt(req.query.depth as string) || 3, 10);

        const pipeline: mongoose.PipelineStage[] = [
            // 1. Start with the root post
            {$match: {_id: new mongoose.Types.ObjectId(startPostId)}},

            // 2. Get all descendants
            {
                $graphLookup: {
                    from: 'posts',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'parent',
                    as: 'replies',
                    maxDepth: maxDepth - 1,
                    depthField: 'level'
                }
            },

            // 3. Lookup authors for all replies
            {
                $lookup: {
                    from: 'users',
                    localField: 'replies.author',
                    foreignField: '_id',
                    as: 'replyAuthors',
                    pipeline: [{$project: {password: 0, emailVerified: 0}}]
                }
            },
        ];

        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            pipeline.push(
                {
                    $lookup: {
                        from: 'votes',
                        localField: 'replies._id',
                        foreignField: 'post',
                        as: 'userVotes',
                        pipeline: [
                            {$match: {user: new mongoose.Types.ObjectId(userId)}},
                            {$project: {_id: 0, voteType: 1, post: 1}}
                        ]
                    }
                }
            );
        }

        pipeline.push(
            {
                $addFields: {
                    replies: {
                        $map: {
                            input: '$replies',
                            as: 'reply',
                            in: {
                                $mergeObjects: [
                                    '$$reply',
                                    {
                                        author: {
                                            $first: {
                                                $filter: {
                                                    input: '$replyAuthors',
                                                    cond: {$eq: ['$$this._id', '$$reply.author']}
                                                }
                                            }
                                        },
                                        userVote: {
                                            $let: {
                                                vars: {
                                                    voteDoc: {
                                                        $first: {
                                                            $filter: {
                                                                input: {$ifNull: ['$userVotes', []]},
                                                                as: 'vote',
                                                                cond: {$eq: ['$$vote.post', '$$reply._id']}
                                                            }
                                                        }
                                                    }
                                                },
                                                in: '$$voteDoc.voteType'
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            // 6. Sort the now fully-populated replies
            {
                $addFields: {
                    replies: {
                        $sortArray: {input: "$replies", sortBy: {createdAt: -1}}
                    }
                }
            },

            // 7. Final cleanup of root author and all our temporary fields
            {
                $project: {
                    "author.password": 0,
                    "author.emailVerified": 0,
                    replyAuthors: 0, // Clean up our temp arrays
                    userVotes: 0
                }
            }
        );


        const results = await Post.aggregate(pipeline);

        if (!results || results.length === 0) {
            return res.status(404).json({message: "Post not found."});
        }

        const postWithReplies = results[0] as IPost & { replies: AggregatedReply[] };

        if (postWithReplies.replies && postWithReplies.replies.length > 0 && postWithReplies.replies && postWithReplies.replies.length > 0) {
            const redisMulti = redisClient.multi();
            postWithReplies.replies.forEach((reply) => {
                const replyId = reply._id.toString();
                redisMulti.scard(`post:${replyId}:upvotes`);
                redisMulti.scard(`post:${replyId}:downvotes`);
            });

            const redisResults = await redisMulti.exec();

            postWithReplies.replies.forEach((reply, index) => {
                const upvotesTuple = redisResults?.[index * 2];
                const downvotesTuple = redisResults?.[index * 2 + 1];
                const upvotes = upvotesTuple?.[1] as number || 0;
                const downvotes = downvotesTuple?.[1] as number || 0;
                reply.score = upvotes - downvotes;
            });
        }


        res.status(200).json(postWithReplies);

    } catch (error) {
        console.error("Error in getReplyTree:", error);
        res.status(500).json({message: 'Server error while fetching reply tree.'});
    }
};