'use client';

import { FormEvent, useState } from 'react';
import SubmitButton from "@/components/SubmitButton";
import { X } from 'lucide-react';

interface InlineEditFormProps {
    initialName: string;
    level: number;
    onCancel: () => void;
    onSave: (newName: string) => Promise<void>;
}

export function InlineEditForm({ initialName, level, onCancel, onSave }: InlineEditFormProps) {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim() || name.trim() === initialName) {
            onCancel();
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await onSave(name.trim());
            // onSave should handle closing the form via state change in parent
        } catch (err) {
            if (err instanceof Error) setError(err.message);
            else setError("An unknown error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const indentation = level * 10 + 20;

    return (
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 py-1 w-full" style={{ paddingLeft: `${indentation}px` }}>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-grow px-2 py-1 text-sm border border-neutral-500 rounded-md focus:ring-0 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        onCancel();
                    }
                }}
            />
            <SubmitButton disabled={isSubmitting} className="px-2 py-1 text-sm">
                Save
            </SubmitButton>
            <button type="button" onClick={onCancel} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md">
                <X size={16} />
            </button>
            {error && <p className="text-red-500 text-xs">{error}</p>}
        </form>
    );
}