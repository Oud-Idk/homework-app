// src/components/Feed/PostFeed.tsx

'use client';

import React, { useState } from 'react';
import { PostItem } from './PostItem';
import { CreatePostModal } from '../../Modals/Post/CreatePostModal';
import { usePosts } from '@/hooks/feed/usePosts';
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import SmallPopup from "@/components/SmallPopup";
import SubmitButton from "@/components/SubmitButton";
import { useSession } from "next-auth/react";
import { Pagination } from '@/components/Pagination';

export const PostFeed: React.FC = () => {
    const {
        currentPage, pagination,
        showRefreshNotification,
        posts, isLoading, error, isSearching,
        searchTerm, setSearchTerm,
        addPost, deletePost, updatePost,
    } = usePosts();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { data: session } = useSession();

    return (
        <div className="max-w-400 mx-auto p-4">
            <div className="flex justify-between items-center mb-6 gap-4">
                <h2 className="text-3xl font-semibold">Community Feed</h2>
                {session && (
                    <SubmitButton onClick={() => setIsCreateModalOpen(true)}>
                        Create Post
                    </SubmitButton>
                )}
            </div>

            <div className="mb-6 p-4 py-2 border rounded-xl flex items-center gap-2">
                <MagnifyingGlassIcon className="h-6 w-6 text-neutral-500" />
                <input
                    type="search"
                    placeholder="Search posts by title or content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-1 bg-transparent focus:outline-none focus:ring-0"
                />
                {isSearching && <span className="text-sm text-neutral-400">Searching...</span>}
            </div>

            {isLoading ? (
                <p className="text-center text-neutral-400">Loading feed...</p>
            ) : error ? (
                <p className="text-center text-red-400">{error}</p>
            ) : posts.length > 0 ? (
                <div className="space-y-4">
                    {posts.map(post => (
                        <PostItem
                            key={post._id}
                            post={post}
                            onDelete={deletePost}
                            onUpdate={updatePost}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center mt-8 p-8 border rounded-lg">
                    No posts found for your search.
                </p>
            )}

            {pagination && !isLoading && (
                <Pagination
                    totalPages={pagination.totalPages}
                    currentPage={currentPage}
                />
            )}

            <CreatePostModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onPostCreated={addPost}
            />

            <SmallPopup show={showRefreshNotification}>New post(s) have been posted. Please refresh to get the new post(s).</SmallPopup>
        </div>
    );
};