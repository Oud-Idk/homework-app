"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Post } from '@/types';
import {buildTree, Methods, reqToApi} from '@/lib/utils';
import { useNotification } from '@/context/NotificationsContext';

export const useReplies = (postId: string) => {
    const { data: session } = useSession();
    const { showError, showSuccess } = useNotification();

    const [repliesMap, setRepliesMap] = useState<Map<string, Post>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchInitialTree = useCallback(async () => {
        if (!postId) return;

        setIsLoading(true);
        setError('');
        try {
            const res = await reqToApi(`posts/${postId}/tree?depth=3`, session);

            if (!res.ok) throw new Error('Failed to load replies.');
            const data = await res.json();

            const newMap = new Map<string, Post>();
            if (data.replies) {
                const addRepliesToMap = (replies: Post[]) => {
                    replies.forEach((reply: Post) => {
                        newMap.set(reply._id, reply);
                        if (reply.replies) {
                            addRepliesToMap(reply.replies);
                        }
                    });
                };
                addRepliesToMap(data.replies);
            }
            setRepliesMap(newMap);

        } catch (err) {
            if (err instanceof Error) showError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [postId, session, showError]); // Add session and showError to dependencies

    useEffect(() => {
        void fetchInitialTree();
    }, [fetchInitialTree]);

    const addReply = useCallback((newReply: Post) => {
        setRepliesMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(newReply._id, newReply);
            return newMap;
        });
    }, []);

    // 3. Wrap createReply in useCallback and refactor to use reqToApi
    const createReply = useCallback(async (content: string, parentPostId: string): Promise<Post> => {
        if (!session?.accessToken) {
            const authError = 'You must be logged in to reply.';
            showError(authError);
            throw new Error(authError);
        }

        try {
            const res = await reqToApi(`posts/${parentPostId}/replies`, session, Methods.POST, { content });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to post reply.');
            }

            const newReply = await res.json();
            addReply(newReply);
            showSuccess('Reply posted successfully!');
            return newReply;

        } catch (error) {
            if (error instanceof Error) showError(error.message);
            throw error;
        }
    }, [session, addReply, showError, showSuccess]);

    const updateReply = useCallback((updatedReply: Post) => {
        setRepliesMap(prevMap => {
            if (!prevMap.has(updatedReply._id)) return prevMap;
            const newMap = new Map(prevMap);
            newMap.set(updatedReply._id, updatedReply);
            return newMap;
        });
    }, []);

    const removeReply = useCallback((deletedReplyId: string) => {
        setRepliesMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.delete(deletedReplyId);
            return newMap;
        });
    }, []);

    // 4. Refactor loadMore to use reqToApi
    const loadMore = useCallback(async (parentId: string) => {
        try {
            const res = await reqToApi(`posts/${parentId}/replies`, session);
            if (!res.ok) throw new Error('Failed to load more replies.');

            const newReplies: Post[] = await res.json();

            setRepliesMap(prevMap => {
                const newMap = new Map(prevMap);
                newReplies.forEach(reply => newMap.set(reply._id, reply));
                return newMap;
            });
        } catch (err) {
            console.error("Failed to load more replies:", err);
            if (err instanceof Error) showError(err.message || 'Could not load more replies.');
        }
    }, [session, showError]); // Add session and showError to dependencies

    const replyTree = useMemo(() => {
        const flatList = Array.from(repliesMap.values());
        return buildTree(flatList, postId);
    }, [repliesMap, postId]);

    return {
        replyTree,
        isLoading,
        error,
        createReply,
        loadMore,
        updateReply,
        removeReply,
    };
};