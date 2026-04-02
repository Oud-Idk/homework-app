"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Post } from '@/types';
import {Methods, reqToApi} from "@/lib/utils";

interface UseDeletePostOptions {
    onSuccessDelete?: (deletedPostId: string) => void;
    onSuccessUpdate?: (updatedPost: Post) => void;
    onError?: (error: Error) => void;
}

export const useDeletePost = (options: UseDeletePostOptions = {}) => {
    const { data: session } = useSession();
    const [isDeleting, setIsDeleting] = useState(false);

    const { onSuccessDelete, onSuccessUpdate, onError } = options;

    const handleDelete = async (postId: string, confirmMessage: string) => {
        if (!session?.accessToken || isDeleting) return;

        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const res = await reqToApi(`posts/${postId}`, session, Methods.DELETE);

            if (res.status === 204) {
                onSuccessDelete?.(postId);
                return;
            }

            if (res.status === 200) {
                const updatedPost = await res.json();
                onSuccessUpdate?.(updatedPost);
                return;
            }

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to delete');
            }

        } catch (error) {
            console.error("Failed to delete:", error);
            const err = error instanceof Error ? error : new Error("An unknown error occurred.");
            if (onError) {
                onError(err);
            } else {
                alert(err.message);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return { isDeleting, handleDelete };
};