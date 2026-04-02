'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {Methods, reqToApi} from "@/lib/utils";

export const useUserRoleUpdater = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
        if (!session?.accessToken) {
            alert("Authentication session not found.");
            return;
        }
        if (!confirm(`Are you sure you want to make this user an '${newRole}'?`)) {
            return;
        }

        setUpdatingId(userId);
        try {
            const res = await reqToApi(`users/${userId}/role`, session, Methods.PATCH, { role: newRole });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to update role");
            }
            router.refresh();
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setUpdatingId(null);
        }
    };

    return {
        updatingId,
        handleRoleChange,
    };
};