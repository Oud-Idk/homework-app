"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {Methods, reqToApi} from "@/lib/utils";

interface UseAddHomeworkProps {
    onSuccess?: () => void; // Callback for when submission is successful
}

interface HomeworkData {
    title: string;
    description: string | undefined;
    dueDate: string;
    groupId: string;
}

export const useAddHomework = ({ onSuccess }: UseAddHomeworkProps) => {
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addHomework = async (data: HomeworkData) => {
        setError(null);

        if (!data.title || !data.description || !data.dueDate || !data.groupId) {
            setError('All fields are required.');
            return;
        }

        if (!session?.accessToken) {
            setError("Authentication error. Please log in again.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await reqToApi('homeworks', session, Methods.POST, {
                ...data,
                dueDate: new Date(data.dueDate).toISOString(),
            })

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create homework');
            }

            onSuccess?.(); // Call the success callback

        } catch (err) {
            if (err instanceof Error) setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return { addHomework, isSubmitting, error };
};