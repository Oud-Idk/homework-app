import { UserForAdmin } from "@/app/admin/users/page";
import { useSession } from "next-auth/react";
import React from "react";

export const ActionButtons = ({ user, updatingId, handleRoleChange }: {
    user: UserForAdmin;
    updatingId: string | null;
    handleRoleChange: (userId: string, newRole: 'admin' | 'member') => void;
}) => {
    const { data: session } = useSession();

    if (session?.user?.id === user._id) {
        return <span className="text-sm text-neutral-500">Cannot change own role</span>;
    }

    return (
        <>
            {user.role === 'admin' ? (
                <button
                    onClick={() => handleRoleChange(user._id, 'member')}
                    disabled={updatingId === user._id}
                    className="disabled:text-neutral-400 disabled:cursor-not-allowed border p-2 rounded-xl hover:bg-neutral-400/15 cursor-pointer"
                >
                    {updatingId === user._id ? 'Updating...' : 'Make Member'}
                </button>
            ) : (
                <button
                    onClick={() => handleRoleChange(user._id, 'admin')}
                    disabled={updatingId === user._id}
                    className="disabled:text-neutral-400 disabled:cursor-not-allowed border p-2 rounded-xl hover:bg-neutral-400/15 cursor-pointer"
                >
                    {updatingId === user._id ? 'Updating...' : 'Make Admin'}
                </button>
            )}
        </>
    );
};