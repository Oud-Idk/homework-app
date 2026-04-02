'use client';

import { FormEvent, useState } from 'react';
import { useGroups } from '@/hooks/homework/useGroups';
import { Group } from '@/types';
import SubmitButton from "@/components/SubmitButton";
import { X } from 'lucide-react';

interface InlineAddFormProps {
    // Change parentId to be optional (string | null)
    parentId: string | null;
    level: number;
    onCancel: () => void;
    onGroupCreated: (newGroup: Group) => void;
}

export function InlineAddForm({ parentId, level, onCancel, onGroupCreated }: InlineAddFormProps) {
    const { createGroup } = useGroups();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setError(null);
        setIsSubmitting(true);

        try {
            // The createGroup hook should be able to handle a null parentId
            const newGroup = await createGroup(name, parentId ?? undefined);
            onGroupCreated(newGroup);
            onCancel();
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const indentation = level * 24;

    return (
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 py-1" style={{ paddingLeft: `${indentation}px` }}>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New group name..."
                className="flex-grow px-2 py-1 text-sm border border-neutral-500 rounded-md focus:ring-0 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        onCancel();
                    }
                }}
            />
            <SubmitButton disabled={isSubmitting} className="px-2 py-1 text-sm">
                Add
            </SubmitButton>
            <button type="button" onClick={onCancel} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md">
                <X size={16} />
            </button>
            {error && <p className="text-red-500 text-xs">{error}</p>}
        </form>
    );
}