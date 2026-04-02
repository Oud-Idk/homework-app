"use client";

import React, { useState } from 'react';
import { useRepliesContext } from '@/context/RepliesContext';
import { MarkdownEditorRenderer } from "@/components/Markdown/MarkdownEditorRenderer";
import SubmitButton from "@/components/SubmitButton";

interface ReplyFormProps {
    postId: string;
    onReplyCreated?: () => void;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({ postId, onReplyCreated }) => {
    const { createReply } = useRepliesContext();
    const [content, setContent] = useState<string | undefined>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!content || !content.trim()) return;

        setIsSubmitting(true);
        try {
            await createReply(content, postId);
            setContent('');
            if (onReplyCreated) {
                onReplyCreated(); // Call the success callback
            }
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-2 pl-4">
            <MarkdownEditorRenderer value={content} onChange={text => setContent(text)} />
            <div className="flex items-center justify-between mt-2">
                <SubmitButton disabled={isSubmitting || (content ? !content.trim() : true)}>
                    {isSubmitting ? 'Replying...' : 'Reply'}
                </SubmitButton>
                {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
        </form>
    );
};