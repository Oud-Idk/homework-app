"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DialogPanel, DialogTitle } from '@headlessui/react';
import { useSession } from 'next-auth/react';
import { Post } from '@/types';
import { MarkdownEditorRenderer } from "@/components/Markdown/MarkdownEditorRenderer";
import SubmitButton from "@/components/SubmitButton";
import {Methods, reqToApi} from "@/lib/utils";
import { useNotification } from "@/context/NotificationsContext";
import { ModalContainer } from "@/components/Modals/ModalContainer";

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    postToEdit: Post;
    onPostUpdated: (updatedPost: Post) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({isOpen, onClose, postToEdit, onPostUpdated}) => {
    const {data: session} = useSession();
    const {showSuccess, showError} = useNotification();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState<string | undefined>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && postToEdit) {
            setTitle(postToEdit.title ?? "");
            setContent(postToEdit.content);
        }
    }, [isOpen, postToEdit]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || !session?.accessToken) return;

        setIsSubmitting(true);

        try {
            const body = {title, content};
            const res = await reqToApi(`posts/${postToEdit._id}`, session, Methods.PATCH, body);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to update post');
            }

            showSuccess('Post updated successfully!');
            onPostUpdated(data);
            onClose();

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            showError(errorMessage);
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, session, title, content, postToEdit, onPostUpdated, onClose, showSuccess, showError]);

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel className="w-full max-w-300 max-h-[calc(100vh-200px)] space-y-4 mt-14 rounded-lg bg-white dark:bg-black p-6 border">
                <DialogTitle className="text-2xl font-bold">Edit Post</DialogTitle>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="h-[calc(100vh-300px)] max-h-[450px] overflow-y-auto space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
                            <input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-700 rounded-md bg-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Content</label>
                            <MarkdownEditorRenderer value={content} onChange={setContent} heightClassName="h-80"/>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose}
                                className="px-4 py-2 rounded-md hover:bg-neutral-400/15">
                            Cancel
                        </button>
                        <SubmitButton disabled={isSubmitting || !title || !content}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </SubmitButton>
                    </div>

                </form>
            </DialogPanel>
        </ModalContainer>
    );
};