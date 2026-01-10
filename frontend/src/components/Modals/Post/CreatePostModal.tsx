import React, { useState } from 'react';
import {
    DialogPanel,
    DialogTitle,
} from '@headlessui/react';
import { XIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { MarkdownEditorRenderer } from "@/components/Markdown/MarkdownEditorRenderer";
import { Post } from '@/types';
import SubmitButton from "@/components/SubmitButton";
import { reqToApi } from "@/lib/utils";
import { ModalContainer } from "@/components/Modals/ModalContainer";
import { HomeworkSelector } from "@/components/HomeworkSelector"; // <-- Import the new component

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPostCreated: (newPost: Post) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onPostCreated }) => {
    const { data: session } = useSession();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState<string | undefined>('');
    const [selectedHomeworkId, setSelectedHomeworkId] = useState<string>(''); // <-- State for the value
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (!content) {
                setError('Content is required');
                return;
            }

            const body: { title: string, content: string, homeworkId?: string } = {
                title,
                content,
            };
            if (selectedHomeworkId) {
                body.homeworkId = selectedHomeworkId;
            }

            const res = await reqToApi('posts', session, 'POST', body);
            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Failed to create post');
                return;
            }

            onPostCreated(data);
            setTitle('');
            setContent('');
            setSelectedHomeworkId('');
            onClose();

        } catch (err) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unexpected network error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel
                as="form"
                onSubmit={handleSubmit}
                className="mt-14 w-full max-w-300 rounded-lg bg-white dark:bg-black p-6 border flex flex-col max-h-[calc(100vh-200px)]"
            >
                <div className="flex justify-between items-center flex-shrink-0">
                    <DialogTitle className="text-xl font-bold">Create New Post</DialogTitle>
                    <XIcon onClick={onClose} className="cursor-pointer text-neutral-500 hover:text-neutral-400" />
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 py-4">
                    {error && <p className="text-sm text-red-400 bg-red-900/50 p-2 rounded-md">{error}</p>}

                    <div>
                        <label htmlFor="post-title" className="block text-sm font-medium mb-1">Title</label>
                        <input
                            id="post-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>

                    {/* Use the new component here */}
                    <HomeworkSelector
                        value={selectedHomeworkId}
                        onChange={setSelectedHomeworkId}
                    />

                    <div>
                        <label htmlFor="post-content" className="block text-sm font-medium mb-1">Content</label>
                        <MarkdownEditorRenderer
                            value={content}
                            onChange={setContent}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4 flex-shrink-0">
                    <SubmitButton
                        disabled={isLoading || !title || !content}
                    >
                        {isLoading ? 'Posting...' : 'Create Post'}
                    </SubmitButton>
                </div>
            </DialogPanel>
        </ModalContainer>
    );
};