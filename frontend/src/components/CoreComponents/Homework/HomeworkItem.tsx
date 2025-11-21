"use client";

import React, { useState } from 'react';
import { Homework } from "@/types";
import { HomeworkDetailsModal } from "@/components/Modals/Homework/HomeworkDetailsModal";
import { MarkdownRenderer } from "@/components/Markdown/MarkdownRenderer";
import { getPastDue, truncateString } from "@/lib/utils";
import { HomeworkButtons } from "@/components/CoreComponents/Homework/HomeworkButtons";
import { useSession } from "next-auth/react";

interface HomeworkItemProps {
    homework: Homework;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    isAdmin: boolean;
    onEdit: (homework: Homework) => void;
    onFollowToggle: (homeworkId: string, isCurrentlyFollowing: boolean) => Promise<void>;
}

const HomeworkItem: React.FC<HomeworkItemProps> = ({ homework, onToggle, onDelete, isAdmin, onEdit, onFollowToggle }) => {
    const [viewingHomeworkDetails, setViewingHomeworkDetails] = React.useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const { data: session } = useSession();

    const isPastDue = getPastDue(homework);
    const isFollowing = !!homework.isFollowing;

    const handleFollowClick = async () => {
        setIsFollowLoading(true);
        await onFollowToggle(homework._id, isFollowing);
        setIsFollowLoading(false);
    };

    const containerClasses = homework.completed
        ? 'bg-green-50/70 dark:bg-green-950/20 border-green-200 dark:border-green-100'
        : !homework.completed && isPastDue
            ? 'bg-neutral-100 dark:bg-neutral-100/5 border-neutral-500'
            : '';

    const textClasses = homework.completed || !homework.completed && isPastDue ? 'text-neutral-500' : '';
    const titleClasses = homework.completed ? 'line-through' : '';

    return (
        <li className={`p-2 px-4 border dark:border-neutral-500 border-neutral-500 dark:hover:border-white hover:border-black transition-colors rounded-md flex justify-between items-center gap-4 ${containerClasses} cursor-pointer`}>
            <div className="flex items-center flex-1 min-w-0">
                <div className={`${textClasses} w-full cursor-pointer pr-3`} onClick={() => setViewingHomeworkDetails(true)}>
                    <div className="flex flex-row-reverse items-center justify-end mb-2">
                        <h3 className={`font-semibold leading-tight text-base break-words ${titleClasses}`}>{homework.title}</h3>
                        {session && <input
                            type="checkbox"
                            checked={homework.completed}
                            onChange={() => onToggle(homework._id)}
                            className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 mr-4 cursor-pointer disabled:cursor-not-allowed"
                            disabled={isPastDue}
                        />}
                    </div>
                    <MarkdownRenderer className="text-sm leading-none dark:[&>*]:text-neutral-200 [&>*]:text-neutral-700 [&>*]:m-0 break-words" content={truncateString(homework.description.split('\n')[0], 50)} />
                    <p className="text-[.7rem] text-neutral-500 leading-tight">
                        Due: {new Date(homework.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        {!homework.completed && isPastDue && <span className="ml-2 font-bold text-red-500">(Past Due)</span>}
                    </p>
                </div>
            </div>
            {session && (
                <HomeworkButtons
                    handleFollowClick={handleFollowClick}
                    isFollowLoading={isFollowLoading}
                    isFollowing={isFollowing}
                    isAdmin={isAdmin}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    homework={homework}
                    isPastDue={isPastDue}
                />
            )}
            <HomeworkDetailsModal isOpen={viewingHomeworkDetails} onClose={() => setViewingHomeworkDetails(false)} homework={homework} onFollowToggle={onFollowToggle} />
        </li>
    );
};

export default HomeworkItem;