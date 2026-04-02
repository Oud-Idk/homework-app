'use client';

import React from 'react';
import { UserForAdmin } from '@/app/admin/users/page';
import { Pagination } from '../Pagination';
import { useUserSearch } from '@/hooks/userManagement/useUserSearch';
import { useUserRoleUpdater } from '@/hooks/userManagement/useUserRoleUpdater';
import { UserView } from "@/components/UserManagement/Views/UserView";

interface UserManagementTableProps {
    users: UserForAdmin[];
    totalPages: number;
    currentPage: number;
}

export function UserManagementTable({ users, totalPages, currentPage }: UserManagementTableProps) {
    const { searchQuery, setSearchQuery, handleSearch, isPending } = useUserSearch();
    const { updatingId, handleRoleChange } = useUserRoleUpdater();

    return (
        <div>
            <form onSubmit={handleSearch} className="mb-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by name or email"
                        className="w-full p-2 border rounded"
                    />
                    <button
                        type="submit"
                        disabled={isPending}
                        className="p-2 px-4 border rounded hover:bg-neutral-400/15 cursor-pointer disabled:opacity-50"
                    >
                        {isPending ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </form>

            <UserView
                users={users}
                updatingId={updatingId}
                handleRoleChange={handleRoleChange}
            />

            <div className="mt-4">
                <Pagination totalPages={totalPages} currentPage={currentPage} />
            </div>
        </div>
    );
}