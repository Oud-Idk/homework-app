'use client';

import { Classroom } from '@/types';
import { useSession } from "next-auth/react";
import { useState, useRef, Fragment } from "react";
import {Methods, reqToApi} from "@/lib/utils";
import SubmitButton from "@/components/SubmitButton";
import {
    Dialog,
    DialogPanel, DialogTitle,
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
    Transition,
    TransitionChild
} from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface Student {
    name: string;
    dateOfBirth: string | Date;
    gender: 'male' | 'female';
}

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
    const [editStudents, setEditStudents] = useState<Student[]>([]);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState<string | null>(null);

    const lastStudentInputRef = useRef<HTMLInputElement>(null);

    const formatDateForInput = (dateString: string | Date) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const handleAddClass = async () => {
        if (!newClassName.trim()) return;
        setLoading(true);
        try {
            const res = await reqToApi('class', session, Methods.DELETE, { name: newClassName, students: [] });
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
            const formattedStudents = editStudents.map(student => ({
                ...student,
                // This turns "2026-01-01T00:00:00.000Z" into "2026-01-01"
                dateOfBirth: new Date(student.dateOfBirth).toISOString().split('T')[0]
            }));

            const res = await reqToApi('class', session, Methods.PATCH, {
                id: editingId,
                name: editName,
                students: formattedStudents
            });

            if (res.ok) {
                const updatedStudents = editStudents.map(student => ({
                    ...student,
                    dateOfBirth: new Date(student.dateOfBirth),
                }));

                setClassrooms(prev => prev.map(c =>
                    c._id === editingId ? {
                        ...c,
                        name: editName,
                        students: updatedStudents
                    } : c
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

            {/* LIST SECTION */}
            <div className="space-y-12 border p-8 rounded-2xl">
                {classrooms.map((classroom) => {
                    const isEditing = editingId === classroom._id;
                    return (
                        <div key={classroom._id} className="group">
                            {/* CLASS HEADER */}
                            <div className="flex justify-between items-end mb-6">
                                <div className="flex-1">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="text-2xl font-bold bg-transparent border-b border-neutral-900 dark:border-neutral-100 focus:outline-none w-full max-w-md"
                                        />
                                    ) : (
                                        <h3 className="text-2xl font-bold">{classroom.name}</h3>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    {isEditing ? (
                                        <>
                                            <button onClick={handleUpdateClass} className="text-sm font-bold underline decoration-2 underline-offset-4">Save</button>
                                            <button onClick={() => setEditingId(null)} className="text-sm font-bold text-neutral-400">Cancel</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => {
                                                setEditingId(classroom._id);
                                                setEditName(classroom.name);
                                                setEditStudents(classroom.students.map(s => ({ ...s })));
                                            }} className="text-xs font-bold uppercase tracking-tighter text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                                                Edit
                                            </button>
                                            <button onClick={() => confirmDelete(classroom._id)} className="text-xs font-bold uppercase tracking-tighter text-neutral-400 hover:text-red-500">
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* STUDENT LIST */}
                            <div className="space-y-1">
                                {!isEditing ? (
                                    <>
                                        {classroom.students.length === 0 && <p className="text-sm text-neutral-400">No students enrolled.</p>}
                                        <div className="divide-y divide-neutral-100 dark:divide-neutral-900 border-t border-neutral-100 dark:border-neutral-900">
                                            {classroom.students.map((student, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-3">
                                                    <span className="text-sm font-medium">{student.name}</span>
                                                    <div className="text-xs text-neutral-500 tabular-nums space-x-4">
                                                        <span className="capitalize">{student.gender}</span>
                                                        <span>{new Date(student.dateOfBirth).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4 pt-4">
                                        {editStudents.map((student, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-4 items-center">
                                                <div className="col-span-5">
                                                    <input
                                                        ref={index === editStudents.length - 1 ? lastStudentInputRef : null}
                                                        type="text"
                                                        placeholder="Name"
                                                        value={student.name}
                                                        onChange={(e) => {
                                                            const updated = [...editStudents];
                                                            updated[index].name = e.target.value;
                                                            setEditStudents(updated);
                                                        }}
                                                        className="w-full bg-transparent border-b border-neutral-200 dark:border-neutral-800 py-1 focus:outline-none text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="date"
                                                        value={formatDateForInput(student.dateOfBirth)}
                                                        onChange={(e) => {
                                                            const updated = [...editStudents];
                                                            updated[index].dateOfBirth = e.target.value;
                                                            setEditStudents(updated);
                                                        }}
                                                        className="w-full bg-transparent border-b border-neutral-200 dark:border-neutral-800 py-1 focus:outline-none text-sm text-neutral-500"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <GenderListbox
                                                        value={student.gender}
                                                        onChange={(val) => {
                                                            if (val === "male" || val === "female") {
                                                                const updated = [...editStudents];
                                                                updated[index].gender = val;
                                                                setEditStudents(updated);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button onClick={() => setEditStudents(prev => prev.filter((_, i) => i !== index))} className="text-neutral-400 hover:text-red-500">
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setEditStudents([...editStudents, { name: '', dateOfBirth: '', gender: 'male' }])}
                                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mt-4"
                                        >
                                            <UserPlusIcon className="w-4 h-4" /> Add Student
                                        </button>
                                    </div>
                                )}
                            </div>
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
                                <p className="text-sm text-neutral-500 mb-8">This will permanently remove the classroom and all associated student data.</p>
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

function GenderListbox({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    const options = ['male', 'female'];
    return (
        <Listbox value={value} onChange={onChange}>
            <div className="relative">
                <ListboxButton className="relative w-full cursor-default border-b border-neutral-200 dark:border-neutral-800 py-1 pl-0 pr-8 text-left text-sm focus:outline-none bg-transparent">
                    <span className="block truncate capitalize">{value}</span>
                    <span className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                        <ChevronUpDownIcon className="h-4 w-4 text-neutral-400" />
                    </span>
                </ListboxButton>
                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 py-1 shadow-xl focus:outline-none text-sm rounded">
                        {options.map((opt) => (
                            <ListboxOption key={opt} value={opt} className={({ active }) => `relative cursor-default select-none py-2 pl-8 pr-4 ${active ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                {({ selected }) => (
                                    <>
                                        <span className={`block truncate capitalize ${selected ? 'font-bold' : 'font-normal'}`}>{opt}</span>
                                        {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-neutral-900 dark:text-neutral-100"><CheckIcon className="h-4 w-4" /></span>}
                                    </>
                                )}
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                </Transition>
            </div>
        </Listbox>
    );
}