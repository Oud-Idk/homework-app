import React, { Fragment, useState } from 'react';
import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { XIcon, CopyIcon, CheckIcon } from 'lucide-react';
import { Post } from '@/types';
import { MarkdownRenderer } from '@/components/Markdown/MarkdownRenderer';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ReplySection } from "@/components/CoreComponents/Feed/Replies/ReplySection";
import { useMarkdownScroller } from "@/hooks/useMarkdownScroller";
import { useSession } from "next-auth/react";
import { ModalContainer } from "@/components/Modals/ModalContainer";

interface PostDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post | null;
    handleDelete: (e: React.MouseEvent) => void;
    isAuthor: boolean;
    isDeleting: boolean;
    handleVote: (e: React.MouseEvent, newVote: "up" | "down") => Promise<void>;
    voteState: {
        score: number;
        userVote: "up" | "down" | null | undefined;
    };
}

export const PostDetailsModal: React.FC<PostDetailsModalProps> = ({
    isOpen,
    onClose,
    post,
    handleDelete,
    isAuthor,
    isDeleting,
    handleVote,
    voteState
}) => {
    const {containerRef, handleLinkClick} = useMarkdownScroller();
    const [isCopied, setIsCopied] = useState(false);
    const {data: session} = useSession();

    if (!post) return null;

    const handleCopyBody = () => {
        if (post?.content) {
            navigator.clipboard.writeText(post.content).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000); // Reset icon after 2 seconds
            }).catch(err => {
                console.error('Failed to copy post body: ', err);
            });
        }
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel
                className="w-full max-w-7xl max-h-[calc(100vh-200px)] flex flex-col rounded-lg bg-white dark:bg-black border">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between items-start flex-col-reverse gap-2 sm:gap-0 sm:flex-row">
                        <div className="flex flex-col items-end w-full sm:block text-right sm:text-left">
                            <DialogTitle className="text-2xl lg:text-4xl font-bold">{post.title}</DialogTitle>
                            <div className="text-xs dark:text-neutral-300 text-neutral-700 mt-2 flex flex-col gap-1">
                                <span>Posted by {post.author.name} on {new Date(post.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</span>
                                {post.homework && (
                                    <span className="text-blue-400">Related Homework: {post.homework.title}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 flex-row justify-end w-full">
                            <div className="flex gap-3 justify-center bg-neutral-400/15 p-2 rounded-xl min-w-8">
                                {session && (
                                    <button onClick={(e) => handleVote(e, 'up')} aria-label="Upvote">
                                        <ArrowUpIcon
                                            className={`h-5 w-5 cursor-pointer ${voteState.userVote === 'up' ? 'text-orange-500' : 'text-neutral-500 hover:text-neutral-400'}`}/>
                                    </button>
                                )}
                                <span className="font-bold text-sm">{voteState.score}</span>
                                {session && (
                                    <button onClick={(e) => handleVote(e, 'down')} aria-label="Downvote">
                                        <ArrowDownIcon
                                            className={`h-5 w-5 cursor-pointer ${voteState.userVote === 'down' ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-400'}`}/>
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handleCopyBody}
                                className="p-1.5 rounded-full text-neutral-500 hover:bg-neutral-400/15 transition-colors"
                                aria-label={isCopied ? "Copied!" : "Copy post body"}
                            >
                                {isCopied ? (
                                    <CheckIcon className="h-5 w-5 text-green-500"/>
                                ) : (
                                    <CopyIcon className="h-5 w-5 hover:text-neutral-400"/>
                                )}
                            </button>

                            {isAuthor && (
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="p-1.5 rounded-full text-neutral-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Delete post"
                                >
                                    {isDeleting ? <div
                                            className="w-5 h-5 border-2 border-t-transparent border-neutral-400 rounded-full animate-spin"></div> :
                                        <TrashIcon className="h-5 w-5 hover:text-red-500"/>}
                                </button>
                            )}
                            <XIcon onClick={onClose}
                                   className="h-6 w-6 cursor-pointer text-neutral-500 hover:text-neutral-400 transition-colors flex-shrink-0"/>
                        </div>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    onClick={handleLinkClick}
                    className="flex-1 overflow-y-auto p-6 space-y-4"
                >
                    <div className="prose prose-invert max-w-none">
                        <MarkdownRenderer content={post.content}/>
                    </div>

                    <hr className="border-neutral-700"/>

                    <ReplySection post={post}/>
                </div>
            </DialogPanel>
        </ModalContainer>
    );
};