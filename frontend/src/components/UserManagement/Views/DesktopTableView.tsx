import Image from "next/image";
import { ActionButtons } from "@/components/UserManagement/ActionButtons";
import React from "react";
import { UserForAdmin } from "@/app/admin/users/page";

interface DesktopTableViewProps {
    users: UserForAdmin[];
    updatingId: string | null;
    handleRoleChange: (userId: string, newRole: ("admin" | "member")) => Promise<void>;
}

export const DesktopTableView = ({
    users, updatingId, handleRoleChange,
}: DesktopTableViewProps) => {
    return (
        <div className="hidden md:block rounded-lg shadow overflow-x-auto border">
            <table className="min-w-full divide-y divide-neutral-200">
                <thead>
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                {users.length > 0 ? (
                    users.map((user) => (
                        <tr key={user._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                        <Image className="h-10 w-10 rounded-full" src={user.image || '/default-avatar.png'} alt="" width={40} height={40} />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium">{user.name}</div>
                                        <div className="text-sm text-neutral-500">{user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="capitalize">{user.role}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {/* 3. Pass down state and handlers from hooks */}
                                <ActionButtons user={user} updatingId={updatingId} handleRoleChange={handleRoleChange} />
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={3} className="text-center py-4">No users found.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    )
}