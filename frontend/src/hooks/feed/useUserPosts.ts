import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { Post, PaginationInfo } from '@/types';
import { reqToApi } from "@/lib/utils";

export function useUserPosts() {
    const { data: session, status } = useSession();

    const [posts, setPosts] = useState<Post[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            if (searchTerm !== debouncedSearchTerm) {
                setCurrentPage(1);
            }
        }, 300);

        return () => clearTimeout(timerId);
    }, [searchTerm, debouncedSearchTerm]);

    const fetchMyPosts = useCallback(async () => {
        if (status !== 'authenticated' || !session) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '10',
            });
            if (debouncedSearchTerm) {
                params.append('q', debouncedSearchTerm);
            }

            const res = await reqToApi(`users/${session?.user?.id}/posts?${params.toString()}`, session)
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'Failed to load your posts.' }));
                throw new Error(errorData.message);
            }
            const data = await res.json();

            setPosts(data.data);
            setPagination(data.pagination);
        } catch (err) {
            setError((err as Error).message);
            setPosts([]);
            setPagination(null);
        } finally {
            setIsLoading(false);
        }
    }, [session, status, currentPage, debouncedSearchTerm]); // Add debouncedSearchTerm dependency

    useEffect(() => {
        fetchMyPosts();
    }, [fetchMyPosts]); // fetchMyPosts is now memoized with all its dependencies

    const deletePost = (postId: string) => {
        setPosts(currentPosts => currentPosts.filter(p => p._id !== postId));
        if (posts.length === 1 && currentPage > 1) {
            setCurrentPage(p => p - 1);
        } else if (pagination) {
            setPagination(p => ({ ...p!, total: p!.total - 1 }));
        }
    };

    const updatePost = (updatedPost: Post) => {
        setPosts(currentPosts =>
            currentPosts.map(p => (p._id === updatedPost._id ? updatedPost : p))
        );
    };

    return {
        posts,
        pagination,
        isLoading,
        error,
        currentPage,
        setCurrentPage,
        searchTerm,
        setSearchTerm,
        deletePost,
        updatePost
    };
}