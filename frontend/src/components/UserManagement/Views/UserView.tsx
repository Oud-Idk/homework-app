import { DesktopTableView } from "@/components/UserManagement/Views/DesktopTableView";
import { MobileCardView } from "@/components/UserManagement/Views/MobileCardView";
import React from "react";
import { UserForAdmin } from "@/app/admin/users/page";

interface UserViewProps {
    users: UserForAdmin[];
    updatingId: string | null;
    handleRoleChange: (userId: string, newRole: ("admin" | "member")) => Promise<void>;
}

export const UserView = ({
    users, updatingId, handleRoleChange,
}: UserViewProps) => {
    return (
        <>
            <DesktopTableView
                users={users}
                updatingId={updatingId}
                handleRoleChange={handleRoleChange}
            />
            <MobileCardView
                users={users}
                updatingId={updatingId}
                handleRoleChange={handleRoleChange}
            />
        </>
    )
}