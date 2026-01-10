'use client';

import { Journal } from "@/types";
import React, { JSX, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useNotification } from "@/context/NotificationsContext";
import { reqToApi } from "@/lib/utils";
import { UpsertJournalModal } from "@/components/Modals/UpsertJournalModal";
import SubmitButton from "@/components/SubmitButton";

interface JournalListProps {
    initialData: Journal[];
}

type FilterState = {
    date: string;
    after: string;
    before: string;
};

export default function JournalList({ initialData }: JournalListProps): JSX.Element {
    const [journals, setJournals] = useState<Journal[]>(initialData);
    const [isLoading, setIsLoading] = useState(false);

    const [filters, setFilters] = useState<FilterState>({ date: '', after: '', before: '' });
    const [activeFilterMode, setActiveFilterMode] = useState<'range' | 'exact'>('range');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJournal, setEditingJournal] = useState<Journal | null>(null);

    const { data: session } = useSession();
    const { showError, showSuccess } = useNotification();
    const isAdmin = session?.user?.role === 'admin';

    useEffect(() => {
        setJournals(initialData);
    }, [initialData]);

    useEffect(() => {
        if (!isAdmin) return;
        const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/events`);
        const handleCreate = (event: MessageEvent) => {
            const newJournal = JSON.parse(event.data);
            if (newJournal.author._id === session?.user?.id) return;
            setJournals((current) => {
                if (current.some(j => j._id === newJournal._id)) return current;
                showSuccess("A new journal entry was added by an admin.");
                return [newJournal, ...current];
            });
        };
        eventSource.addEventListener('journal_create', handleCreate);
        return () => eventSource.close();
    }, [isAdmin, session?.user?.id, showSuccess]);

    const fetchJournals = useCallback(async (overrideFilters?: FilterState) => {
        setIsLoading(true);
        const currentFilters = overrideFilters || filters;

        // Build Query String
        const params = new URLSearchParams();
        if (activeFilterMode === 'exact' && currentFilters.date) {
            params.append('date', currentFilters.date);
        } else if (activeFilterMode === 'range') {
            if (currentFilters.after) params.append('after', currentFilters.after);
            if (currentFilters.before) params.append('before', currentFilters.before);
        }

        try {
            const res = await reqToApi(`journal?${params.toString()}`, session, 'GET');

            if (!res.ok) throw new Error("Failed to fetch filtered journals");

            const data = await res.json();
            setJournals(data.data);
        } catch (error) {
            console.error(error);
            showError("Failed to filter journals.");
        } finally {
            setIsLoading(false);
        }
    }, [filters, activeFilterMode, session, showError]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const clearFilters = () => {
        setFilters({ date: '', after: '', before: '' });
        setJournals(initialData); // Reset to initial SSR data
    };

    const handleOpenAddModal = useCallback(() => {
        setEditingJournal(null);
        setIsModalOpen(true);
    }, []);

    const handleOpenEditModal = useCallback((journal: Journal) => {
        setEditingJournal(journal);
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingJournal(null);
    }, []);


    const handleSaveJournal = useCallback(async (data: { date: string; activities: { name: string; description: string }[] }) => {
        const originalJournals = [...journals];
        handleCloseModal();

        try {
            let res;
            if (editingJournal) {
                res = await reqToApi(`journal/${editingJournal._id}`, session, 'PUT', data);
            } else {
                res = await reqToApi(`journal`, session, 'POST', data);
            }

            const savedJournal = await res.json();
            if (!res.ok) throw new Error(savedJournal.message || "Failed to save journal.");

            if (editingJournal) {
                setJournals(current => current.map(j => j._id === editingJournal._id ? savedJournal : j));
                showSuccess("Journal updated successfully.");
            } else {
                setJournals(current => [savedJournal, ...current].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()));
                showSuccess("Journal created successfully.");
            }
        } catch (error) {
            console.error("Error saving journal:", error);
            setJournals(originalJournals);
            if (error instanceof Error) showError(error.message || "Could not save the journal entry.");
        }
    }, [journals, editingJournal, session, handleCloseModal, showError, showSuccess]);

    const handleDeleteJournal = useCallback(async (journalId: string) => {
        if (!window.confirm("Are you sure you want to delete this journal entry?")) {
            return;
        }

        const originalJournals = [...journals];
        setJournals(current => current.filter(j => j._id !== journalId));

        try {
            const res = await reqToApi(`journal/${journalId}`, session, 'DELETE');

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to delete journal.");
            }
            showSuccess("Journal entry deleted.");
        } catch (error) {
            console.error("Error deleting journal:", error);
            setJournals(originalJournals);
            if (error instanceof Error) showError(error.message);
        }
    }, [journals, session, showError, showSuccess]);


    return (
        <>
            <div className="w-full max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Journal Entries</h1>
                    {isAdmin && (
                        <SubmitButton onClick={handleOpenAddModal} className="ml-2">Add New Entry</SubmitButton>
                    )}
                </div>

                <div className="p-4 rounded-xl flex flex-col md:flex-row gap-4 border items-center md:items-center justify-between">
                    <div className="flex flex-col items-center md:flex-row gap-4 w-full">
                        <div className="flex flex-col ms:flex-row bg-white dark:bg-neutral-900 rounded-lg p-1 border border-neutral-300 dark:border-neutral-700 h-fit">
                            <button
                                onClick={() => setActiveFilterMode('range')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${activeFilterMode === 'range' ? 'bg-neutral-500 text-white' : 'text-neutral-500'}`}
                            >
                                Range
                            </button>
                            <button
                                onClick={() => setActiveFilterMode('exact')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${activeFilterMode === 'exact' ? 'bg-neutral-500 text-white' : 'text-neutral-500'}`}
                            >
                                Exact Date
                            </button>
                        </div>

                        {activeFilterMode === 'range' ? (
                            <div className="flex gap-2 w-full md:w-auto justify-center flex-col sm:flex-row">
                                <div className="flex flex-col">
                                    <label className="text-xs text-neutral-500 ml-1">After</label>
                                    <input
                                        type="date"
                                        name="after"
                                        value={filters.after}
                                        onChange={handleFilterChange}
                                        className="border rounded-md px-3 py-1.5 bg-white dark:bg-neutral-900 dark:border-neutral-700 text-sm"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-neutral-500 ml-1">Before</label>
                                    <input
                                        type="date"
                                        name="before"
                                        value={filters.before}
                                        onChange={handleFilterChange}
                                        className="border rounded-md px-3 py-1.5 bg-white dark:bg-neutral-900 dark:border-neutral-700 text-sm"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <label className="text-xs text-neutral-500 ml-1">On Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={filters.date}
                                    onChange={handleFilterChange}
                                    className="border rounded-md px-3 py-1.5 bg-white dark:bg-neutral-900 dark:border-neutral-700 text-sm w-full md:w-48"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 flex-col sm:flex-row">
                        <button
                            onClick={clearFilters}
                            className="text-sm text-neutral-500 hover:text-black dark:hover:text-white px-3 py-1.5"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => fetchJournals()}
                            disabled={isLoading}
                            className="border px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer hover:bg-neutral-500/20 disabled:opacity-50"
                        >
                            {isLoading ? 'Filtering...' : 'Apply Filters'}
                        </button>
                    </div>
                </div>

                {/* Journal List Display */}
                {journals.length > 0 ? (
                    journals.map((journal: Journal) => (
                        <div key={journal._id} className="border p-4 md:p-6 rounded-xl w-full bg-white dark:bg-neutral-900/50 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h2 className="font-bold text-base md:text-xl lg:text-2xl">
                                        {new Date(journal.entryDate).toLocaleDateString(undefined, {
                                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
                                        })}
                                    </h2>
                                    <p className="text-neutral-500">By {journal.author.name}</p>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-2 flex-col md:flex-row pl-2">
                                        <button onClick={() => handleOpenEditModal(journal)} className="text-sm px-3 py-1 rounded-md border hover:bg-neutral-400/20 cursor-pointer">Edit</button>
                                        <button onClick={() => handleDeleteJournal(journal._id)} className="text-sm px-3 py-1 rounded-md border text-red-500 hover:bg-red-500/10 cursor-pointer">Delete</button>
                                    </div>
                                )}
                            </div>
                            <ol className="border-t pt-3 mt-3 space-y-2 border-neutral-500">
                                {journal.activities.map((activity, index) => (
                                    <li key={index} className="list-decimal ml-6">
                                        <p><span className="font-semibold">{activity.name}</span>: <span>{activity.description}</span></p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-neutral-500 mt-8 p-8 border-2 border-dashed rounded-lg">
                        <p>No journal entries found.</p>
                        {(filters.date || filters.before || filters.after) && (
                            <p className="mt-2 text-sm">Try adjusting your filters.</p>
                        )}
                    </div>
                )}
            </div>

            <UpsertJournalModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveJournal}
                journal={editingJournal}
            />
        </>
    );
}