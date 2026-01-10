"use client";

import { Homework } from "@/types";
import { DialogPanel, DialogTitle } from "@headlessui/react";
import { useState } from "react";
import { ScrollableMarkdownViewer } from "@/components/Markdown/ScrollableMarkdownViewer";
import { XIcon } from "lucide-react";
import React from "react";
import { useSession } from "next-auth/react";
import { ModalContainer } from "@/components/Modals/ModalContainer";

interface HomeworkDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    homework: Homework | null;
    onFollowToggle: (homeworkId: string, isCurrentlyFollowing: boolean) => Promise<void>;
}

export const HomeworkDetailsModal: React.FC<HomeworkDetailsModalProps> = ({
                                                                              isOpen,
                                                                              onClose,
                                                                              homework,
                                                                              onFollowToggle,
                                                                          }) => {
    const [isLoading, setIsLoading] = useState(false);
    const {data: session} = useSession();

    if (!homework) return null;

    const handleFollowClick = async () => {
        setIsLoading(true);
        await onFollowToggle(homework._id, !!homework.isFollowing);
        setIsLoading(false);
    };

    const isFollowing = !!homework.isFollowing;

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel
                className="max-w-7xl max-h-[calc(100vh-200px)] mt-14 w-full flex flex-col border bg-white dark:bg-black rounded-lg"
            >
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 space-y-4">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl font-bold">Homework</DialogTitle>
                        <div className="flex items-center gap-4">
                            {session && (
                                <button
                                    onClick={handleFollowClick}
                                    disabled={isLoading}
                                    className={`border px-3 py-2 rounded-md hover:bg-neutral-400/25 disabled:opacity-50 cursor-pointer ${
                                        isFollowing ? 'border-blue-400 text-blue-400' : ''
                                    }`}
                                >
                                    {isLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                                </button>
                            )}
                            <XIcon onClick={() => onClose()} className="cursor-pointer"/>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">{homework.title}</h1>
                        <p className="text-sm text-neutral-500">Due: {new Date(homework.dueDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</p>
                    </div>
                </div>

                <ScrollableMarkdownViewer
                    content={homework.description}
                    className="flex-1"
                    markdownClassName="p-6"
                />
            </DialogPanel>
        </ModalContainer>
    )
}