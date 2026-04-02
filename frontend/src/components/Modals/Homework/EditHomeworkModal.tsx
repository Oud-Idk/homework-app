'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { DialogPanel, DialogTitle } from '@headlessui/react';
import { Group, Homework } from '@/types';
import { MarkdownEditorRenderer } from "@/components/Markdown/MarkdownEditorRenderer";
import SubmitButton from "@/components/SubmitButton";
import { ModalContainer } from "@/components/Modals/ModalContainer";

interface EditHomeworkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedHomework: Omit<Homework, '_id' | 'completed'>) => void;
    homework: Homework | null;
    groups: Group[];
}

export const EditHomeworkModal: React.FC<EditHomeworkModalProps> = ({isOpen, onClose, onSave, homework, groups}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        groupId: '',
    });

    useEffect(() => {
        if (homework) {
            setFormData({
                title: homework.title,
                description: homework.description,
                // Format date for the input[type="date"] which expects 'YYYY-MM-DD'
                dueDate: new Date(homework.dueDate).toISOString().split('T')[0],
                groupId: homework.groupId,
            });
        }
    }, [homework]);

    if (!homework) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const submissionData = {
            ...formData,
            dueDate: new Date(formData.dueDate).toISOString(),
            userId: homework.userId,
        };
        onSave(submissionData);
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel className="max-w-300 mt-12 w-full space-y-4 border bg-white dark:bg-black p-6 rounded-lg">
                <DialogTitle className="text-xl font-semibold">Edit Homework</DialogTitle>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4 h-[calc(100vh-300px)] max-h-[469px] overflow-y-auto">
                        <div>
                            <label htmlFor="title"
                                   className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
                            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange}
                                   required
                                   className="mt-1 p-1 border border-neutral-500/50 block w-full rounded-md sm:text-sm dark:bg-neutral-900"/>
                        </div>
                        <div>
                            <label htmlFor="description"
                                   className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</label>

                            <MarkdownEditorRenderer
                                value={formData.description}
                                onChange={(text) => setFormData(prev => ({...prev, description: text ? text : ''}))}
                            />
                        </div>
                        <div>
                            <label htmlFor="dueDate"
                                   className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Due
                                Date</label>
                            <input type="date" name="dueDate" id="dueDate" value={formData.dueDate}
                                   onChange={handleChange} required
                                   className="mt-1 p-1 border border-neutral-500/50 block w-full rounded-md sm:text-sm dark:bg-neutral-900"/>
                        </div>
                        <div>
                            <label htmlFor="groupId"
                                   className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Group</label>
                            <select name="groupId" id="groupId" value={formData.groupId} onChange={handleChange}
                                    required
                                    className="mt-1 p-1 border border-neutral-500/50 block w-full rounded-md sm:text-sm dark:bg-neutral-900">
                                <option value="" disabled>Select a group</option>
                                {groups.map(group => <option key={group._id} value={group._id}>{group.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose}
                                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-400/25 cursor-pointer">Cancel
                        </button>
                        <SubmitButton>Save Changes</SubmitButton>
                    </div>
                </form>
            </DialogPanel>
        </ModalContainer>
    );
};