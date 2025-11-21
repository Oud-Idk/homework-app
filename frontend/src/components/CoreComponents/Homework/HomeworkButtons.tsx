import React from "react";
import { Homework } from "@/types";
import { twMerge } from "tailwind-merge";

interface HomeworkButtonsProps {
    handleFollowClick: () => Promise<void>;
    isFollowLoading: boolean;
    isFollowing: boolean;
    isAdmin: boolean;
    onEdit: (hw: Homework) => void;
    onDelete: (id: string) => void;
    homework: Homework;
    className?: string;
    isPastDue: boolean;
}

export const HomeworkButtons = ({
    handleFollowClick,
    isFollowLoading,
    homework,
    isFollowing,
    isAdmin,
    onEdit,
    onDelete,
    className,
    isPastDue,
}: HomeworkButtonsProps) => {
    return (
        <div className={twMerge("flex items-center gap-2 flex-shrink-0 flex-col md:flex-row", className)}>
            <button
                onClick={handleFollowClick}
                disabled={isFollowLoading || isPastDue}
                className={`w-full md:w-auto border text-xs p-1 md:p-2.5 rounded-md hover:bg-neutral-400/25 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${
                    isFollowing ? 'border-blue-400 text-blue-400' : ''
                }`}
            >
                {isFollowLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
            {isAdmin && (
                <>
                    <button
                        onClick={() => onEdit(homework)}
                        className="w-full md:w-auto border border-indigo-400 text-indigo-400 hover:bg-indigo-400/10 p-1 md:p-2.5 text-xs rounded cursor-pointer"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(homework._id)}
                        className="w-full md:w-auto border border-red-400 text-red-400 hover:bg-red-400/10 p-1 md:p-2.5 text-xs rounded cursor-pointer "
                    >
                        Delete
                    </button>
                </>
            )}
        </div>
    )
}