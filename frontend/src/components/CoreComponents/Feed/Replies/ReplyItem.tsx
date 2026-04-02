"use client";

import React, { useState } from 'react';
import { Post } from '@/types';
import { useSession } from "next-auth/react";
import { MarkdownRenderer } from '@/components/Markdown/MarkdownRenderer';
import { ReplyForm } from '../../../Forms/ReplyForm';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline"; // Added PencilIcon
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ReplyModal } from "@/components/Modals/Post/ReplyModal";
import { useVote } from '@/hooks/feed/useVote';
import { useDeletePost } from "@/hooks/feed/useDeletePost";
import { useRepliesContext } from '@/context/RepliesContext';
import { EditReplyModal } from "@/components/Modals/Post/EditReplyModal"; // Import the new modal

interface ReplyItemProps {
    reply: Post;
}
export const ReplyItem = ({ reply }: ReplyItemProps) => {
    const { data: session } = useSession();
    const isSmallScreen = useMediaQuery('(max-width: 768px)');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for the edit modal
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const { loadMore, updateReply, removeReply } = useRepliesContext();
    const { score, userVote, handleVote } = useVote(reply);
    const { isDeleting, handleDelete: performDelete } = useDeletePost({
        onSuccessUpdate: updateReply,
        onSuccessDelete: removeReply,
    });

    const isAuthor = session?.user?.id === reply.author?._id;
    const isAdmin = session?.user?.role === 'admin';

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        await loadMore(reply._id);
        setIsLoadingMore(false);
    };

    const handleReplySuccess = () => {
        setIsFormOpen(false);
    };

    // Callback function for when a reply is successfully updated
    const handleReplyUpdated = (updatedReply: Post) => {
        updateReply(updatedReply); // Update the state in the context
        setIsEditModalOpen(false); // Close the modal
    };

    const showLoadMore = !reply.isDeleted && reply.replyCount > (reply.replies?.length || 0);

    if (reply.isDeleted) {
        return (
            <div className="pl-4 border-l-2 border-neutral-800 my-8">
                <div className="text-xs text-neutral-500 italic">
                    [deleted]
                </div>
                <div className="mt-2 space-y-2">
                    {reply.replies?.map(child => (
                        <ReplyItem key={child._id} reply={child} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="pl-4 border-l-2 border-neutral-800 my-8">
                <div className="text-xs">
                    <span className="font-semibold">{reply.author.name}</span>
                    <span className="mx-1.5">·</span>
                    <span>{new Date(reply.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="text-sm py-2 prose prose-sm prose-invert max-w-none">
                    <MarkdownRenderer content={reply.content} className="[&>*]:mt-0 [&>*]:mb-0" />
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleVote('up')} aria-label="Upvote">
                            <ArrowUpIcon className={`h-4 w-4 cursor-pointer ${userVote === 'up' ? 'text-orange-500' : 'text-neutral-500 hover:text-neutral-400'}`} />
                        </button>
                        <span className="font-semibold">{score}</span>
                        <button onClick={() => handleVote('down')} aria-label="Downvote">
                            <ArrowDownIcon className={`h-4 w-4 cursor-pointer ${userVote === 'down' ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-400'}`} />
                        </button>
                    </div>
                    <button onClick={() => setIsFormOpen(!isFormOpen)} className="font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer">
                        {isFormOpen && !isSmallScreen ? 'Cancel' : 'Reply'}
                    </button>
                    {(isAuthor || isAdmin) && (
                        <>
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <PencilIcon className="h-4 w-4"/>
                                Edit
                            </button>
                            <button
                                onClick={() => performDelete(reply._id, "Are you sure you want to delete this reply?")}
                                disabled={isDeleting}
                                className="font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <TrashIcon className="h-4 w-4"/>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </>
                    )}
                </div>

                {!isSmallScreen && isFormOpen && (
                    <ReplyForm postId={reply._id} onReplyCreated={handleReplySuccess} />
                )}

                <div className="mt-2 space-y-2">
                    {reply.replies?.map(child => (
                        <ReplyItem key={child._id} {...{reply: child}} />
                    ))}
                </div>

                {showLoadMore && (
                    <button onClick={handleLoadMore} disabled={isLoadingMore} className="text-xs text-blue-400 hover:text-blue-300 mt-2 cursor-pointer">
                        {isLoadingMore ? 'Loading...' : `View more replies (${reply.replyCount - (reply.replies?.length || 0)})`}
                    </button>
                )}
            </div>
            {isSmallScreen && (
                <ReplyModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    postToReplyTo={reply}
                />
            )}
            {isAuthor && (
                <EditReplyModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    replyToEdit={reply}
                    onReplyUpdated={handleReplyUpdated}
                />
            )}
        </>
    );
};