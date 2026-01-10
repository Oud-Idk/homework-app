'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Group } from "@/types";
import { reqToApi } from "@/lib/utils";
import { useNotification } from "@/context/NotificationsContext";

export const useGroups = () => {
    const { data: session } = useSession();
    const { showError, showSuccess } = useNotification();

    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = useCallback(async () => {
        if (!session?.accessToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await reqToApi('groups', session);

            if (!res.ok) {
                throw new Error("Failed to fetch groups");
            }
            const data: Group[] = await res.json();
            setGroups(data);
        } catch (err) {
            if (err instanceof Error) showError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [session, showError]);

    useEffect(() => {
        void fetchGroups();
    }, [fetchGroups]);

    // 5. Wrap createGroup in useCallback for performance optimization
    const createGroup = useCallback(async (name: string, parentId?: string) => {
        if (!session?.accessToken) {
            const authError = "Authentication required.";
            showError(authError);
            throw new Error(authError);
        }
        try {
            const body = { name, parentId: parentId || undefined };
            const res = await reqToApi('groups', session, 'POST', body);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Failed to create group");
            }

            showSuccess(`Group "${name}" created successfully!`);
            await fetchGroups();
            return data;
        } catch (error) {
            console.error("Create group error:", error);
            if (error instanceof Error) showError(error.message || "An unknown error occurred.");
            throw error;
        }
    }, [session, fetchGroups, showError, showSuccess]);

    return { groups, isLoading, error, createGroup, refetchGroups: fetchGroups };
};