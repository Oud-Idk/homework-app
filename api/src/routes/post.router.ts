import { Router } from 'express';
import { protect, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createPostSchema, updatePostSchema, paginationSchema,
    postIdParamSchema, idParamSchema, createReplySchema, voteSchema, homeworkIdParamSchema
} from '../schemas/app.schemas.js';
import {
    createPost, deletePost, getAllPosts, getHomeworkPost, getPost, updatePost,
} from '../controllers/feed/post.controller.js';
import {handleVote} from "../controllers/feed/vote.controller.js";
import {createReply, getReplies, getReplyTree} from "../controllers/feed/reply.controller.js";

const router = Router({ mergeParams: true });

// Read
router.get('/', optionalAuth, validate({ query: paginationSchema }), getAllPosts);
router.get('/:postId', validate({ params: postIdParamSchema }), getPost);
router.get('/homework/:homeworkId', validate({ params: homeworkIdParamSchema }), getHomeworkPost);

// Write
router.post('/', protect, validate({ body: createPostSchema }), createPost);
router.patch('/:postId', protect, validate({ params: postIdParamSchema, body: updatePostSchema }), updatePost);
router.delete('/:postId', protect, validate({ params: postIdParamSchema }), deletePost);

// Votes
router.post('/:id/vote', protect, validate({ params: idParamSchema, body: voteSchema }), handleVote);

// Replies
router.get('/:id/replies', optionalAuth, validate({ params: idParamSchema }), getReplies);
router.post('/:id/replies', optionalAuth, validate({ params: idParamSchema, body: createReplySchema }), createReply);
router.get('/:id/tree', optionalAuth, validate({ params: idParamSchema, query: paginationSchema }), getReplyTree);

export default router;