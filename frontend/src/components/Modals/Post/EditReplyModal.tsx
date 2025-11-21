"use client";

import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { useSession } from 'next-auth/react';
import { Post } from '@/types';
import { MarkdownEditorRenderer } from "@/components/Markdown/MarkdownEditorRenderer";
import { reqToApi } from "@/lib/utils";
import SubmitButton from "@/components/SubmitButton";
import { ModalContainer } from "@/components/Modals/ModalContainer";

interface EditReplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    replyToEdit: Post;
    onReplyUpdated: (updatedReply: Post) => void;
}

export const EditReplyModal: React.FC<EditReplyModalProps> = ({isOpen, onClose, replyToEdit, onReplyUpdated}) => {
    const {data: session} = useSession();
    const [content, setContent] = useState<string | undefined>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && replyToEdit) {
            setContent(replyToEdit.content);
            setError(null);
        }
    }, [isOpen, replyToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || !session?.accessToken) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await reqToApi(`posts/${replyToEdit._id}`, session, 'PUT', {content: content})
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to update reply');
            }

            onReplyUpdated(data);
            onClose();

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel className="w-full max-w-300 space-y-4 rounded-lg bg-white dark:bg-black p-6 border mt-12">
                <DialogTitle className="text-2xl font-bold">Edit Reply</DialogTitle>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="h-[calc(100vh-300px)] max-h-108 md:max-h-92 overflow-y-auto">
                        <label className="block text-sm font-medium mb-1">Content</label>
                        <MarkdownEditorRenderer value={content} onChange={text => setContent(text)}
                                                heightClassName="h-86"/>
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose}
                                className="px-4 py-2 rounded-md hover:bg-neutral-400/15">
                            Cancel
                        </button>
                        <SubmitButton
                            disabled={isSubmitting || !content || content === replyToEdit.content}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </SubmitButton>
                    </div>
                </form>
            </DialogPanel>
        </ModalContainer>
    );
};