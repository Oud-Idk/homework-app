// src/hooks/feed/usePosts.ts

'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Post, PaginationInfo } from '@/types';
import { reqToApi } from "@/lib/utils";

export const usePosts = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // --- URL State Management ---
    // Page and query are now derived directly from the URL
    const currentPage = Number(searchParams.get('page')) || 1;
    const urlQuery = searchParams.get('q') || '';

    // Local state for the search input, allowing for debouncing before updating the URL
    const [searchTerm, setSearchTerm] = useState(urlQuery);

    // --- Component State ---
    const [posts, setPosts] = useState<Post[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRefreshNotification, setShowRefreshNotification] = useState(false);

    // Debounce effect to update the URL when the search term changes
    useEffect(() => {
        const timerId = setTimeout(() => {
            // Only update the URL if the debounced term is different from the current URL query
            if (searchTerm !== urlQuery) {
                const params = new URLSearchParams(searchParams);
                params.set('page', '1'); // Reset to page 1 for a new search

                if (searchTerm) {
                    params.set('q', searchTerm);
                } else {
                    params.delete('q');
                }

                startTransition(() => {
                    // Using replace to avoid polluting browser history with every keystroke
                    router.replace(`${pathname}?${params.toString()}`);
                });
            }
        }, 500); // 500ms debounce delay

        return () => clearTimeout(timerId);
    }, [searchTerm, urlQuery, pathname, router, searchParams]);


    // Effect to fetch posts when URL parameters (page, query) or session change
    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: '10',
                });
                if (urlQuery) {
                    params.append('q', urlQuery);
                }

                const res = await reqToApi(`posts?${params.toString()}`, session);
                if (!res.ok) throw new Error('Failed to fetch posts');
                const data = await res.json();

                setPosts(data.data);
                setPagination(data.pagination);
            } catch (err) {
                setError('Could not load the feed. Please try again later.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        // Don't fetch until the session is loaded
        if (session === undefined) return;

        fetchPosts();
    }, [currentPage, urlQuery, session]); // Dependency on URL-derived state

    // --- SSE and Optimistic Updates (largely unchanged) ---
    useEffect(() => {
        const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/events`);

        const handleNewPost = (event: MessageEvent) => {
            const { authorId } = JSON.parse(event.data);
            if (authorId === session?.user?.id) return;
            if (!urlQuery) setShowRefreshNotification(true);
        };

        eventSource.addEventListener('post_create', handleNewPost);
        eventSource.onerror = (err) => console.error('SSE connection error:', err);

        return () => eventSource.close();
    }, [session, urlQuery]);

    const addPost = useCallback((newPost: Post) => {
        if (currentPage === 1 && !urlQuery) {
            setPosts(currentPosts => [newPost, ...currentPosts]);
            if (pagination) {
                setPagination(p => ({ ...p!, total: p!.total + 1 }));
            }
        }
    }, [currentPage, urlQuery, pagination]);

    const deletePost = useCallback((postIdToDelete: string) => {
        setPosts(currentPosts => currentPosts.filter(post => post._id !== postIdToDelete));
        if (pagination && pagination.total > 0) {
            setPagination(p => ({ ...p!, total: p!.total - 1 }));
        }
    }, [pagination]);

    const updatePost = useCallback((updatedPost: Post) => {
        setPosts(currentPosts =>
            currentPosts.map(p => (p._id === updatedPost._id ? updatedPost : p))
        );
    }, []);

    // Return everything the component needs
    return {
        posts,
        pagination,
        isLoading,
        error,
        currentPage, // Derived from URL
        searchTerm, // Local state for the input
        setSearchTerm, // Setter for the local state
        addPost,
        deletePost,
        updatePost,
        showRefreshNotification,
        isSearching: isPending, // Expose pending state for search
    };
};