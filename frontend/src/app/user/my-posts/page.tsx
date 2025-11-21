'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { PostItem } from '@/components/CoreComponents/Feed/PostItem'; // Adjust path if needed
import { useUserPosts } from '@/hooks/feed/useUserPosts';
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline"; // Import our new hook

export default function MyPostsPage() {
    const { status } = useSession();
    const {
        posts,
        pagination,
        isLoading,
        error,
        currentPage,
        setCurrentPage,
        deletePost,
        updatePost,
        searchTerm,
        setSearchTerm,
    } = useUserPosts();

    // Render logic for session status
    if (status === 'loading') {
        return <div className="text-center p-10">Loading session...</div>;
    }
    if (status === 'unauthenticated') {
        return <div className="text-center p-10">Please sign in to view your posts.</div>;
    }

    return (
        <main className="container mx-auto p-2">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">My Posts</h1>
            </div>

            <div className="mb-6 p-4 py-2 border rounded-xl flex flex-row gap-2 bg-white dark:bg-neutral-900">
                <MagnifyingGlassIcon className="h-8 w-8 text-neutral-500" />
                <input
                    type="search"
                    placeholder="Search your posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-1 focus:outline-none focus:ring-0 bg-transparent"
                />
            </div>

            {isLoading ? (
                <p className="text-center text-neutral-400">Loading your posts...</p>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : posts.length > 0 ? (
                <div className="space-y-4">
                    {posts.map(post => (
                        <PostItem
                            key={post._id}
                            post={post}
                            onDelete={deletePost} // Pass the handler from our hook
                            onUpdate={updatePost} // Pass the handler from our hook
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-neutral-500 mt-8 p-8 border rounded-lg">
                    <h3 className="text-xl font-semibold">No Posts Found</h3>
                    <p className="mt-2">
                        {searchTerm
                            ? `No results for "${searchTerm}".`
                            : "You haven't created any posts yet."
                        }
                    </p>
                </div>
            )}

            {/* Re-using the pagination component from PostFeed */}
            {pagination && pagination.totalPages > 1 && !isLoading && (
                <div className="flex justify-between items-center mt-8">
                    <button
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 hover:bg-neutral-400/15 border border-neutral-700 rounded-md disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <div className="flex items-center gap-2 text-sm">
                        <span>Page {currentPage} of {pagination.totalPages}</span>
                    </div>
                    <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === pagination.totalPages}
                        className="px-4 py-2 hover:bg-neutral-400/15 border border-neutral-700 rounded-md disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </main>
    );
}