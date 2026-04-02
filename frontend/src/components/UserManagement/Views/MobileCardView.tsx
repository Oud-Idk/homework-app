import Image from "next/image";
import { ActionButtons } from "@/components/UserManagement/ActionButtons";
import React from "react";
import { UserForAdmin } from "@/app/admin/users/page";

interface MobileCardViewProps {
    users: UserForAdmin[];
    updatingId: string | null;
    handleRoleChange: (userId: string, newRole: ("admin" | "member")) => Promise<void>;
}

export const MobileCardView = ({
    users, updatingId, handleRoleChange,
}: MobileCardViewProps) => {
    return (
        <div className="md:hidden space-y-3">
            {users.length > 0 ? (
                users.map(user => (
                    <div key={user._id} className="p-4 rounded-lg shadow border">
                        <div className="flex justify-between flex-col items-start gap-4">
                            <div className="flex items-center gap-3">
                                <Image className="h-10 w-10 rounded-full" src={user.image || '/default-avatar.png'} alt="" width={40} height={40} />
                                <div>
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-neutral-500 text-wrap break-all">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex flex-row items-center justify-between gap-5 text-sm w-full">
                                <div>
                                    <span className="capitalize text-xs mt-1 text-neutral-500">{user.role}</span>
                                    <div className="text-xs text-neutral-500">{user.classroomName ?? "No Class"}</div>
                                </div>
                                <ActionButtons user={user} updatingId={updatingId} handleRoleChange={handleRoleChange} />
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-4">No users found.</div>
            )}
        </div>
    )
}