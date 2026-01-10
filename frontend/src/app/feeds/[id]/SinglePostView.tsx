"use client";

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowDownIcon,
    ArrowUpIcon,
    TrashIcon,
    PencilSquareIcon,
    CheckIcon,
    ClipboardDocumentIcon // Changed from CopyIcon for Heroicons consistency if needed
} from "@heroicons/react/24/outline";

// Types & Utils
import { Post } from '@/types';
import { useMarkdownScroller } from "@/hooks/useMarkdownScroller";
import { useVote } from '@/hooks/feed/useVote';
import { useDeletePost } from "@/hooks/feed/useDeletePost";

// Components
import { MarkdownRenderer } from '@/components/Markdown/MarkdownRenderer';
import { ReplySection } from "@/components/CoreComponents/Feed/Replies/ReplySection";
import { EditPostModal } from "@/components/Modals/Post/EditPostModal";

interface SinglePostViewProps {
    initialPost: Post;
}

export const SinglePostView: React.FC<SinglePostViewProps> = ({ initialPost }) => {
    const router = useRouter();
    const { data: session } = useSession();

    // Local state to handle updates (e.g. after editing title/body)
    const [post, setPost] = useState<Post>(initialPost);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Custom Hooks
    const { containerRef, handleLinkClick } = useMarkdownScroller();
    const { score, userVote, handleVote } = useVote(post);

    const { isDeleting, handleDelete: performDelete } = useDeletePost({
        onSuccessDelete: () => {
            router.push('/feeds'); // Redirect back to feed after delete
            router.refresh();
        }
    });

    const isAuthor = session?.user?.id === post.author._id;
    const isAdmin = session?.user?.role === 'admin';

    const handleDelete = () => {
        void performDelete(post._id, "Are you sure you want to delete this post? This cannot be undone.");
    };

    const handleCopyBody = () => {
        if (post?.content) {
            navigator.clipboard.writeText(post.content).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => console.error('Failed to copy: ', err));
        }
    };

    const onPostUpdated = (updatedPost: Post) => {
        setPost(updatedPost); // Update local view
        setIsEditModalOpen(false);
    };

    return (
        <>
            <div className="max-w-5xl mx-auto w-full">
                <article className="bg-white dark:bg-black overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="flex flex-col-reverse md:flex-row justify-between items-start gap-4">
                            <div className="w-full">
                                <h1 className="text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                                    {post.title}
                                </h1>

                                <div className="text-sm text-neutral-600 dark:text-neutral-400 flex flex-wrap gap-x-4 gap-y-1">
                                    <span>
                                        Posted by <span className="font-semibold text-neutral-900 dark:text-neutral-200">{post.author.name}</span>
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {new Date(post.createdAt).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>

                                    {post.homework && (
                                        <div className="w-full mt-1">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                Related Homework: {post.homework.title}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Toolbar */}
                            <div className="flex items-center gap-3 self-end md:self-start flex-shrink-0">
                                {/* Voting Pill */}
                                <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 rounded-lg">
                                    {session && (
                                        <button onClick={() => handleVote('up')} aria-label="Upvote" className="p-1 hover:bg-white dark:hover:bg-neutral-800 rounded">
                                            <ArrowUpIcon className={`h-5 w-5 ${userVote === 'up' ? 'text-orange-500' : 'text-neutral-500'}`} />
                                        </button>
                                    )}
                                    <span className="font-bold text-sm min-w-[20px] text-center">{score}</span>
                                    {session && (
                                        <button onClick={() => handleVote('down')} aria-label="Downvote" className="p-1 hover:bg-white dark:hover:bg-neutral-800 rounded">
                                            <ArrowDownIcon className={`h-5 w-5 ${userVote === 'down' ? 'text-blue-500' : 'text-neutral-500'}`} />
                                        </button>
                                    )}
                                </div>

                                {/* Tools */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleCopyBody}
                                        className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                                        title="Copy Markdown"
                                    >
                                        {isCopied ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                                    </button>

                                    {(isAuthor || isAdmin) && (
                                        <>
                                            <button
                                                onClick={() => setIsEditModalOpen(true)}
                                                className="p-2 rounded-full text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                title="Edit Post"
                                            >
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>

                                            <button
                                                onClick={handleDelete}
                                                disabled={isDeleting}
                                                className="p-2 rounded-full text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                                title="Delete Post"
                                            >
                                                {isDeleting ? (
                                                    <div className="w-5 h-5 border-2 border-t-transparent border-red-500 rounded-full animate-spin" />
                                                ) : (
                                                    <TrashIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div
                        ref={containerRef}
                        onClick={handleLinkClick}
                        className="p-6 sm:p-8 min-h-[200px]"
                    >
                        <div className="prose prose-neutral dark:prose-invert max-w-none">
                            <MarkdownRenderer content={post.content} />
                        </div>
                    </div>

                    <div className="border-t border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
                        <h3 className="text-lg font-semibold mb-6">Replies</h3>
                        <ReplySection post={post} />
                    </div>

                </article>
            </div>

            {/* Edit Modal (Portal) */}
            <EditPostModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                postToEdit={post}
                onPostUpdated={onPostUpdated}
            />
        </>
    );
};