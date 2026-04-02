'use client';

import { useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { MarkdownEditorRenderer } from "@/components/Markdown/MarkdownEditorRenderer";
import { useGroups } from '@/hooks/homework/useGroups';
import { useAddHomework } from '@/hooks/homework/useAddHomework';
import { GroupSelector } from '@/components/CoreComponents/Homework/GroupSelector';
import SubmitButton from "@/components/SubmitButton";

export function AddHomeworkForm() {
    const { data: session } = useSession();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState<string | undefined>('');
    const [dueDate, setDueDate] = useState('');
    const [groupId, setGroupId] = useState('');

    const { groups, isLoading: isLoadingGroups, error: groupsError } = useGroups();

    const clearForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setGroupId('');
    };

    const { addHomework, isSubmitting, error: submissionError } = useAddHomework({
        onSuccess: clearForm,
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await addHomework({ title, description, dueDate, groupId });
    };

    if (!session) {
        return (
            <div className="text-center p-8 border-2 border-dashed rounded-lg mb-8 dark:border-neutral-600">
                <p className="dark:text-neutral-300">Please sign in to add homework.</p>
            </div>
        );
    }

    const error = submissionError || groupsError;

    return (
        <form onSubmit={handleSubmit} className="mb-8 p-6 border rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">Add New Homework</h2>
            <div className="flex flex-col gap-3">
                <label>Title</label>
                <input required type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="p-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-600" />

                <div>
                    <label>Description</label>
                    <MarkdownEditorRenderer
                        value={description}
                        onChange={text => setDescription(text)}
                        heightClassName="h-60 mt-3"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-4 mt-4">
                    <div className="w-full">
                        <label>Due Date</label>
                        <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="px-3 py-2 border rounded-md dark:bg-neutral-900 dark:text-white dark:border-neutral-600 w-full" />
                    </div>
                    <div className="w-full">
                        <label>Group</label>
                        <GroupSelector
                            groups={groups}
                            value={groupId} // <-- Changed from selectedGroupId to value
                            onChange={setGroupId}
                            isLoading={isLoadingGroups}
                        />
                    </div>
                </div>
            </div>
            <SubmitButton disabled={isSubmitting} className="w-full mt-4">
                {isSubmitting ? "Adding..." : "Add Homework"}
            </SubmitButton>
            {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
        </form>
    );
}