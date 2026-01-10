import { Router } from 'express';
import { optionalAuth, protect } from '../middleware/auth.middleware.js';
import {
    createPost,
    deletePost,
    getAllPosts,
    getHomeworkPost, getPost,
    updatePost
} from '../controllers/feed/post.controller.js';
import {createReply, getReplies, getReplyTree} from "../controllers/feed/reply.controller.js";
import { handleVote } from "../controllers/feed/vote.controller.js";

const router = Router({ mergeParams: true });

router.get('/homework/:homeworkId', getHomeworkPost);

router.get('/', optionalAuth, getAllPosts);
router.post('/', protect, createPost);
router.get('/:postId', getPost);
router.put('/:postId', protect, updatePost);
router.delete('/:postId', protect, deletePost);
router.post('/:id/vote', protect, handleVote);
router.get('/:id/replies', optionalAuth, getReplies);
router.post('/:id/replies', optionalAuth, createReply);
router.get('/:id/tree', optionalAuth, getReplyTree);

export default router;