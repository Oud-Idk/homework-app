'use client';

import { Classroom } from '@/types';
import { useSession } from "next-auth/react";
import { useState, Fragment } from "react";
import { Methods, reqToApi } from "@/lib/utils";
import SubmitButton from "@/components/SubmitButton";
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild
} from '@headlessui/react';

interface ClassExplorerProps {
    initialClassrooms: Classroom[];
}

export function ClassesExplorer({ initialClassrooms }: ClassExplorerProps) {
    const { data: session } = useSession();
    const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
    const [loading, setLoading] = useState(false);

    const [newClassName, setNewClassName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState<string | null>(null);

    const handleAddClass = async () => {
        if (!newClassName.trim()) return;
        setLoading(true);
        try {
            const res = await reqToApi('class', session, Methods.POST, { name: newClassName });
            if (res.ok) {
                const createdClass = await res.json();
                setClassrooms([...classrooms, createdClass.data || createdClass]);
                setNewClassName("");
            }
        } finally { setLoading(false); }
    };

    const handleUpdateClass = async () => {
        if (!editingId || !editName.trim()) return;
        setLoading(true);
        try {
            const res = await reqToApi('class', session, Methods.PATCH, {
                id: editingId,
                name: editName
            });

            if (res.ok) {
                setClassrooms(prev => prev.map(c =>
                    c._id === editingId ? { ...c, name: editName } : c
                ));
                setEditingId(null);
            } else {
                console.error(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id: string) => {
        setClassToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteClass = async () => {
        if (!classToDelete) return;
        setLoading(true);
        try {
            const res = await reqToApi('class', session, Methods.DELETE, { id: classToDelete });
            if (res.ok) {
                setClassrooms(prev => prev.filter(c => c._id !== classToDelete));
                setIsDeleteDialogOpen(false);
            }
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-10">
            <div className="pb-8 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">New Classroom</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="Class Name"
                        className="flex-1 bg-transparent border border-neutral-200 dark:border-neutral-800 p-2 rounded focus:outline-none transition-all"
                    />
                    <SubmitButton onClick={handleAddClass} disabled={loading}>{loading ? '...' : 'Create'}</SubmitButton>
                </div>
            </div>

            <div className="border p-5 rounded-2xl">
                {classrooms.map((classroom, i) => {
                    const isEditing = editingId === classroom._id;
                    return (
                        <div key={classroom._id}>
                            <div className="flex justify-between items-center py-2">
                                <div className="flex-1">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="text-2xl font-bold bg-transparent border-b border-neutral-900 dark:border-neutral-100 focus:outline-none w-full max-w-md"
                                            autoFocus
                                        />
                                    ) : (
                                        <h3 className="text-2xl font-bold">{classroom.name}</h3>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    {isEditing ? (
                                        <>
                                            <button onClick={handleUpdateClass}
                                                    className="text-sm font-bold underline decoration-2 underline-offset-4">Save
                                            </button>
                                            <button onClick={() => setEditingId(null)}
                                                    className="text-sm font-bold text-neutral-400">Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => {
                                                setEditingId(classroom._id);
                                                setEditName(classroom.name);
                                            }}
                                                    className="text-xs font-bold uppercase tracking-tighter text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                                                Edit
                                            </button>
                                            <button onClick={() => confirmDelete(classroom._id)}
                                                    className="text-xs font-bold uppercase tracking-tighter text-neutral-400 hover:text-red-500">
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {classrooms.length !== i + 1 && <hr className="my-2 border-neutral-100 dark:border-neutral-800"/>}
                        </div>
                    );
                })}
                {classrooms.length === 0 && <p className="text-sm text-neutral-400">No classes yet. Make one!</p>}
            </div>

            {/* DELETE MODAL */}
            <Transition show={isDeleteDialogOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteDialogOpen(false)}>
                    <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-neutral-950/20 backdrop-blur-sm" />
                    </TransitionChild>
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <DialogPanel className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded shadow-2xl">
                                <DialogTitle className="text-xl font-bold mb-2">Confirm Delete</DialogTitle>
                                <p className="text-sm text-neutral-500 mb-8">This will permanently remove the classroom.</p>
                                <div className="flex justify-end gap-6">
                                    <button onClick={() => setIsDeleteDialogOpen(false)} className="text-sm font-bold text-neutral-400">Cancel</button>
                                    <button onClick={handleDeleteClass} className="text-sm font-bold text-red-600 underline underline-offset-4 decoration-2">Delete</button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}