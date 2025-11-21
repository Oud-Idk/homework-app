'use client';

import React from 'react'; // Removed useMemo as we aren't using groupMap inside the item anymore
import { DialogPanel, DialogTitle } from '@headlessui/react';
import { Group, Homework } from '@/types';
import { ModalContainer } from "@/components/Modals/ModalContainer";
import HomeworkItem from "@/components/CoreComponents/Homework/HomeworkItem"; // Adjust path as needed

interface AllHomeworkModalProps {
    isOpen: boolean;
    onClose: () => void;
    homeworks: Homework[];
    groups: Group[];

    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    isAdmin: boolean;
    onEdit: (homework: Homework) => void;
    onFollowToggle: (homeworkId: string, isCurrentlyFollowing: boolean) => Promise<void>;
}

export const AllHomeworkModal: React.FC<AllHomeworkModalProps> = ({
    isOpen,
    onClose,
    homeworks,
    onToggle,
    onDelete,
    isAdmin,
    onEdit,
    onFollowToggle
}) => {

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel className="max-w-7xl max-h-[calc(90vh-170px)] mt-12 w-full border bg-white dark:bg-black p-6 rounded-lg flex flex-col">
                <DialogTitle className="text-xl font-semibold mb-4">
                    All Homework (Sorted by Due Date)
                </DialogTitle>

                {/* Changed to UL because HomeworkItem renders an LI */}
                <ul className="space-y-3 overflow-y-auto pr-2 flex-1 min-h-0">
                    {homeworks.length > 0 ? (
                        homeworks.map(hw => (
                            <HomeworkItem
                                key={hw._id}
                                homework={hw}
                                onToggle={onToggle}
                                onDelete={onDelete}
                                isAdmin={isAdmin}
                                onEdit={onEdit}
                                onFollowToggle={onFollowToggle}
                            />
                        ))
                    ) : (
                        <p className="text-center text-neutral-500 mt-8">
                            No homework assignments to display.
                        </p>
                    )}
                </ul>

                <div className="flex justify-end pt-4 mt-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-400/25 cursor-pointer transition-colors"
                    >
                        Close
                    </button>
                </div>
            </DialogPanel>
        </ModalContainer>
    );
};