"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Post } from '@/types';
import { MarkdownRenderer } from '@/components/Markdown/MarkdownRenderer';
import { truncateString } from "@/lib/utils";
import { PostDetailsModal } from "@/components/Modals/Post/PostDetailsModal";
import { ArrowDownIcon, ArrowUpIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { EditPostModal } from "@/components/Modals/Post/EditPostModal";
import { useVote } from '@/hooks/feed/useVote';
import { useDeletePost } from "@/hooks/feed/useDeletePost";

interface PostItemProps {
    post: Post;
    onDelete: (postId: string) => void;
    onUpdate: (updatedPost: Post) => void;
}

export const PostItem: React.FC<PostItemProps> = ({ post, onDelete, onUpdate }) => {
    const { data: session } = useSession();
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { score, userVote, handleVote: performVote } = useVote(post);
    const { isDeleting, handleDelete: performDelete } = useDeletePost({
        onSuccessDelete: onDelete
    });

    const isAuthor = session?.user?.id === post.author._id;
    const isAdmin = session?.user?.role === 'admin';

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        performDelete(post._id, "Are you sure you want to delete this post?");
    };

    const handleVoteClick = async (e: React.MouseEvent, newVote: 'up' | 'down') => {
        e.stopPropagation();
        await performVote(newVote);
    };

    const handleOpenEditModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditModalOpen(true);
    };


    return (
        <>
            <article
                className="p-4 border border-neutral-500 dark:border-neutral-400 rounded-lg relative group cursor-pointer hover:border-black dark:hover:border-white transition-colors"
                onClick={() => setIsDetailsModalOpen(true)}
            >
                <div className="absolute left-0 top-0 bottom-0 flex gap-2 flex-col items-center justify-center p-2 bg-neutral-400/15 rounded-l-lg min-w-8">
                    {session && (
                        <button onClick={(e) => handleVoteClick(e, 'up')} aria-label="Upvote">
                            <ArrowUpIcon className={`h-5 w-5 cursor-pointer ${userVote === 'up' ? 'text-orange-500' : 'text-neutral-500 hover:text-neutral-400'}`} />
                        </button>
                    )}
                    <span className="font-bold text-sm">{score}</span>
                    {session && (
                        <button onClick={(e) => handleVoteClick(e, 'down')} aria-label="Downvote">
                            <ArrowDownIcon className={`h-5 w-5 cursor-pointer ${userVote === 'down' ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-400'}`} />
                        </button>
                    )}
                </div>
                <div className="ml-12 mr-8">
                    {(isAuthor || isAdmin) && (
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                            <button
                                onClick={handleOpenEditModal}
                                className="p-1.5 rounded-full bg-neutral-300 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-all cursor-pointer focus:opacity-100"
                                aria-label="Edit post"
                            >
                                <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleDeleteClick}
                                disabled={isDeleting}
                                className="p-1.5 rounded-full bg-neutral-300 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-all cursor-pointer focus:opacity-100"
                                aria-label="Delete post"
                            >
                                {isDeleting ? (
                                    <div className="w-5 h-5 border-2 border-t-transparent border-neutral-400 rounded-full animate-spin"></div>
                                ) : (
                                    <TrashIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    )}

                    <header className="mb-2 pr-10">
                        <h3 className="text-xl font-semibold">{post.title}</h3>
                        <div className="text-xs text-neutral-500 mt-1 flex flex-col gap-1">
                            <div>
                                <span>Posted by {post.author.name}</span>
                                <span className="mx-2">·</span>
                                <span>{new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            {post.homework && (
                                <span>Homework: {post.homework.title}</span>
                            )}
                        </div>
                    </header>
                    <div>
                        <MarkdownRenderer content={
                            post.content.startsWith('![')
                            && post.content.split('\n')[0].trim().endsWith(')')
                                ? post.content.split('\n')[0]
                                : truncateString(post.content.split('\n')[0], 100)}
                        />
                    </div>
                </div>
            </article>

            <PostDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                post={post}
                handleDelete={handleDeleteClick}
                isAuthor={isAuthor}
                isDeleting={isDeleting}
                handleVote={handleVoteClick}
                voteState={{ score, userVote }}
            />

            <EditPostModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                postToEdit={post}
                onPostUpdated={onUpdate}
            />
        </>
    );
};