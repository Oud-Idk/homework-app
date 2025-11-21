// ReplySection.tsx
"use client";

import React from 'react';
import { Post } from '@/types';
import { RepliesProvider, useRepliesContext } from '@/context/RepliesContext'; // Adjust path
import { ReplyItem } from './ReplyItem';
import { ReplyForm } from '../../../Forms/ReplyForm';

// The new child component that consumes the context
const ReplySectionContent = ({ post }: { post: Post }) => {
    const {
        replyTree,
        isLoading,
        error,
    } = useRepliesContext(); // Use the context hook here

    if (isLoading) {
        return <div className="text-neutral-400 text-sm">Loading replies...</div>;
    }

    if (error) {
        return <div className="text-red-400 text-sm">Error: {error}</div>;
    }

    return (
        <>
            <h3 className="text-lg font-semibold mb-2">Replies ({post.replyCount || 0})</h3>
            <ReplyForm postId={post._id} onReplyCreated={() => { /* Can be used to clear form etc. */}} />
            <hr className="border-neutral-800 my-6" />

            <div className="space-y-4">
                {replyTree.length > 0 ? (
                    replyTree.map(reply => (
                        <ReplyItem
                            key={reply._id}
                            reply={reply}
                        />
                    ))
                ) : (
                    <p className="text-sm text-neutral-500 pt-4">No replies yet. Be the first!</p>
                )}
            </div>
        </>
    );
};


export const ReplySection = ({ post }: { post: Post }) => {
    return (
        <RepliesProvider postId={post._id}>
            <div className="mt-4">
                <ReplySectionContent post={post} />
            </div>
        </RepliesProvider>
    );
};