'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { DialogPanel, DialogTitle } from '@headlessui/react';
import { Journal } from '@/types';
import SubmitButton from "@/components/SubmitButton";
import { X } from "lucide-react";
import { useTheme } from "next-themes";
import { ModalContainer } from "@/components/Modals/ModalContainer";

interface UpsertJournalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { date: string; activities: { name: string; description: string }[] }) => void;
    journal: Journal | null; // null for 'create', object for 'edit'
}

export const UpsertJournalModal: React.FC<UpsertJournalModalProps> = ({isOpen, onClose, onSave, journal}) => {
    const {resolvedTheme} = useTheme();

    const [date, setDate] = useState('');
    const [activities, setActivities] = useState<{ name: string; description: string }[]>([{
        name: '',
        description: ''
    }]);

    const isEditing = !!journal;

    useEffect(() => {
        if (isOpen) {
            if (journal) {
                // Populate form for editing
                setDate(new Date(journal.entryDate).toISOString().split('T')[0]);
                setActivities(journal.activities.length > 0 ? journal.activities : [{name: '', description: ''}]);
            } else {
                // Reset form for creating
                setDate(new Date().toISOString().split('T')[0]); // Default to today
                setActivities([{name: '', description: ''}]);
            }
        }
    }, [journal, isOpen]);

    const handleActivityChange = (index: number, field: 'name' | 'description', value: string) => {
        const updatedActivities = [...activities];
        updatedActivities[index][field] = value;
        setActivities(updatedActivities);
    };

    const addActivity = () => {
        setActivities([...activities, {name: '', description: ''}]);
    };

    const removeActivity = (index: number) => {
        if (activities.length <= 1) return; // Don't remove the last one
        const updatedActivities = activities.filter((_, i) => i !== index);
        setActivities(updatedActivities);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        // Filter out any completely empty activities before saving
        const validActivities = activities.filter(act => act.name.trim() !== '' || act.description.trim() !== '');
        onSave({date, activities: validActivities});
    };

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel
                className="max-w-300 w-full max-h-[calc(100vh-200px)] border bg-white dark:bg-black p-6 rounded-lg flex-col flex">
                <div className="flex-shrink-0 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                    <DialogTitle className="text-xl font-semibold">
                        {isEditing ? 'Edit Journal Entry' : 'Add New Journal Entry'}
                    </DialogTitle>
                </div>

                <div
                    className={`flex-grow overflow-y-auto py-4 px-2 ${resolvedTheme === 'dark' ? 'scrollbar-thin-dark' : 'scrollbar-thin'}`}>
                    <form id="journal-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="date"
                                   className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Date</label>
                            <input type="date" name="date" id="date" value={date}
                                   onChange={(e) => setDate(e.target.value)} required
                                   className="mt-1 p-1 border border-neutral-500/50 block w-full rounded-md sm:text-sm dark:bg-neutral-900"/>
                        </div>

                        <div>
                            <label
                                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Activities</label>
                            <div className="space-y-3 mt-1">
                                {activities.map((activity, index) => (
                                    <div key={index}
                                         className="flex items-start gap-2 p-2 border border-neutral-500 rounded-md">
                                        <div className="flex-grow space-y-2">
                                            <input type="text" placeholder="Activity Name" value={activity.name}
                                                   onChange={(e) => handleActivityChange(index, 'name', e.target.value)}
                                                   className="p-1 border border-neutral-500/50 block w-full rounded-md sm:text-sm dark:bg-neutral-900/50 focus:ring-0 focus:outline-none"/>
                                            <textarea placeholder="Description" value={activity.description}
                                                      onChange={(e) => handleActivityChange(index, 'description', e.target.value)}
                                                      rows={2}
                                                      className="p-1 border border-neutral-500/50 block w-full rounded-md sm:text-sm dark:bg-neutral-900/50 focus:ring-0 focus:outline-none"/>
                                        </div>
                                        <button type="button" onClick={() => removeActivity(index)}
                                                disabled={activities.length <= 1}
                                                className="text-red-500 disabled:text-neutral-500 p-1 hover:bg-red-500/10 rounded-full cursor-pointer">
                                            <X className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addActivity}
                                    className="mt-2 text-sm text-blue-500 hover:underline cursor-pointer">
                                + Add another activity
                            </button>
                        </div>
                    </form>
                </div>

                <div
                    className="flex-shrink-0 flex justify-end gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button type="button" onClick={onClose}
                            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-400/25">Cancel
                    </button>
                    <SubmitButton onClick={handleSubmit}>{isEditing ? 'Save Changes' : 'Create Entry'}</SubmitButton>
                </div>
            </DialogPanel>
        </ModalContainer>
    );
};