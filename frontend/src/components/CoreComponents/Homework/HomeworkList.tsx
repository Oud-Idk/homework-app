"use client";

import { useSession } from "next-auth/react";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Group, Homework } from "@/types";
import { EditHomeworkModal } from "@/components/Modals/Homework/EditHomeworkModal";
import { AllHomeworkModal } from "@/components/Modals/Homework/AllHomeworkModal";
import GroupNodeRenderer from "@/components/CoreComponents/Homework/GroupNodeRenderer";
import { getPastDue, reqToApi } from "@/lib/utils";
import { useNotification } from "@/context/NotificationsContext";

interface HomeworkListProps {
    initialHomeworks: Homework[];
    initialGroups: Group[];
}

interface GroupNode {
    groupDetails: Group;
    children: GroupNode[];
    homeworks: Homework[];
}

export function HomeworkList({ initialHomeworks, initialGroups }: HomeworkListProps) {
    const { data: session } = useSession();
    const [homeworks, setHomeworks] = useState<Homework[]>(initialHomeworks);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

    const [isAllHomeworkModalOpen, setIsAllHomeworkModalOpen] = useState(false);
    const handleOpenAllHomeworkModal = useCallback(() => setIsAllHomeworkModalOpen(true), []);
    const handleCloseAllHomeworkModal = useCallback(() => setIsAllHomeworkModalOpen(false), []);

    const { showError } = useNotification();

    const isAdmin = session?.user?.role === 'admin';

    useEffect(() => {
        const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/events`);

        eventSource.onopen = () => console.log('SSE connection to homework events is open.');
        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            showError("Live connection failed. Data may not be up-to-date.");
        }

        const handleCreate = (event: MessageEvent) => {
            const newHomework = JSON.parse(event.data);
            setHomeworks((current) => [{ ...newHomework, completed: false }, ...current]);
        };

        const handleDeleteEvent = (event: MessageEvent) => {
            const { id } = JSON.parse(event.data);
            setHomeworks((current) => current.filter(hw => hw._id !== id));
        };

        const handleUpdateCompletion = (event: MessageEvent) => {
            const { userId, homeworkId, completed } = JSON.parse(event.data);
            if (session?.user?.id === userId) {
                setHomeworks((current) =>
                    current.map(hw =>
                        hw._id === homeworkId ? { ...hw, completed: completed } : hw
                    )
                );
            }
        };

        const handleFullUpdate = (event: MessageEvent) => {
            const updatedHomework = JSON.parse(event.data);
            setHomeworks((current) =>
                current.map(hw =>
                    hw._id === updatedHomework._id ? { ...hw, ...updatedHomework } : hw
                )
            );
        };

        eventSource.addEventListener('homework_create', handleCreate);
        eventSource.addEventListener('homework_delete', handleDeleteEvent);
        eventSource.addEventListener('homework_completion_update', handleUpdateCompletion);
        eventSource.addEventListener('homework_full_update', handleFullUpdate);

        return () => {
            eventSource.close();
            console.log('SSE connection to homework events closed.');
        };

    }, [session, showError]);

    const handleOpenEditModal = useCallback((homework: Homework) => {
        setEditingHomework(homework);
        setIsEditModalOpen(true);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setEditingHomework(null);
    }, []);

    const handleFollowToggle = useCallback(async (homeworkId: string) => {
        const homework = homeworks.find(hw => hw._id === homeworkId);
        if (!homework) return;

        const isCurrentlyFollowing = !!homework.isFollowing;
        const originalHomeworks = [...homeworks];

        setHomeworks(currentHomeworks =>
            currentHomeworks.map(hw =>
                hw._id === homeworkId ? { ...hw, isFollowing: !isCurrentlyFollowing } : hw
            )
        );

        try {
            const method = isCurrentlyFollowing ? 'DELETE' : 'POST';
            const res = await reqToApi(`homeworks/${homeworkId}/follow`, session, method);

            if (!res.ok) {
                console.error("Server failed to toggle follow:", res.status);
                setHomeworks(originalHomeworks);
                showError("Couldn't update follow status. Please try again.");
                return;
            }
            console.log("Follow status updated successfully!");
        } catch (error) {
            console.error("Network error toggling follow:", error);
            setHomeworks(originalHomeworks);
            showError("Couldn't update follow status. Please try again.");
        }
    }, [homeworks, session, showError]);


    const handleUpdateHomework = useCallback(async (updatedData: Omit<Homework, '_id' | 'completed' | 'isFollowing'>) => {
        if (!editingHomework) return;

        const originalHomeworks = [...homeworks];
        setHomeworks(current =>
            current.map(hw =>
                hw._id === editingHomework._id ? { ...hw, ...updatedData } : hw
            )
        );
        handleCloseEditModal();

        try {
            const res = await reqToApi(`homeworks/${editingHomework._id}`, session, 'PUT', updatedData);

            if (!res.ok) {
                console.error("Server failed to update homework:", res.status);
                setHomeworks(originalHomeworks);
                showError("Failed to update homework.");
                return;
            }
        } catch (error) {
            console.error("Network error updating homework:", error);
            setHomeworks(originalHomeworks);
            showError("Failed to update homework. Please try again.");
        }
    }, [editingHomework, homeworks, session, handleCloseEditModal, showError]);


    const handleToggleComplete = useCallback(async (homeworkId: string) => {
        const originalHomeworks = [...homeworks];
        setHomeworks(current =>
            current.map(hw =>
                hw._id === homeworkId ? { ...hw, completed: !hw.completed } : hw
            )
        );

        try {
            const res = await reqToApi(`homeworks/${homeworkId}/toggle`, session, 'PATCH');

            if (!res.ok) {
                console.error("Server failed to toggle complete:", res.status);
                setHomeworks(originalHomeworks);
                showError("Could not update status.");
                return;
            }
        } catch (error) {
            console.error("Network error toggling complete:", error);
            setHomeworks(originalHomeworks);
            showError("Could not update status. Please try again.");
        }
    }, [homeworks, session, showError]);


    const handleDelete = useCallback(async (homeworkId: string) => {
        const originalHomeworks = [...homeworks];
        setHomeworks(current => current.filter(hw => hw._id !== homeworkId));

        try {
            const res = await reqToApi(`homeworks/${homeworkId}`, session, 'DELETE');

            if (!res.ok) {
                console.error("Server failed to delete homework:", res.status);
                setHomeworks(originalHomeworks);
                showError("Failed to delete homework.");
                return;
            }
        } catch (error) {
            console.error("Network error deleting homework:", error);
            setHomeworks(originalHomeworks);
            showError("Failed to delete homework. Please try again.");
        }
    }, [homeworks, session, showError]);

    const groupTree = useMemo<GroupNode[]>(() => {
        const nodes: { [id: string]: GroupNode } = {};
        initialGroups.forEach(group => {
            nodes[group._id] = { groupDetails: group, children: [], homeworks: [] };
        });

        homeworks.forEach(hw => {
            if (hw.groupId && nodes[hw.groupId]) {
                nodes[hw.groupId].homeworks.push(hw);
            }
        });

        const rootNodes: GroupNode[] = [];
        initialGroups.forEach(group => {
            const node = nodes[group._id];
            const lastSlashIndex = group.path.lastIndexOf('/');

            if (lastSlashIndex === -1) {
                rootNodes.push(node);
            } else {
                const parentPath = group.path.substring(0, lastSlashIndex);
                const parentGroup = initialGroups.find(g => g.path === parentPath);
                if (parentGroup && nodes[parentGroup._id]) {
                    nodes[parentGroup._id].children.push(node);
                } else {
                    rootNodes.push(node);
                }
            }
        });

        const sortNodes = (nodesList: GroupNode[]) => {
            nodesList.sort((a, b) => a.groupDetails.name.localeCompare(b.groupDetails.name));
            nodesList.forEach(node => sortNodes(node.children));
        };
        sortNodes(rootNodes);

        return rootNodes;
    }, [homeworks, initialGroups]);

    const allUndoneHomeworkSortedByDueDate = useMemo(() => {
        return [...homeworks]
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .filter(homework => !getPastDue(homework))
            .filter(homework => !homework.completed);
    }, [homeworks]);

    return (
        <div className="mt-10">
            <div className="flex justify-between items-start md:items-center mb-6 flex-col md:flex-row gap-3">
                <h2 className="text-3xl font-semibold">Current Homework</h2>
                <button
                    onClick={handleOpenAllHomeworkModal}
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-400/25 cursor-pointer"
                >
                    View All by Due Date
                </button>
            </div>

            {groupTree.length > 0 ? (
                <div className="space-y-4">
                    {groupTree.map((node) => (
                        <GroupNodeRenderer
                            key={node.groupDetails._id}
                            node={node}
                            isAdmin={isAdmin}
                            handleDelete={handleDelete}
                            handleToggleComplete={handleToggleComplete}
                            handleOpenEditModal={handleOpenEditModal}
                            handleFollowToggle={handleFollowToggle}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-neutral-500 mt-8 p-8 border-2 border-dashed rounded-lg">
                    <p>No homework assignments found.</p>
                </div>
            )}

            <EditHomeworkModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleUpdateHomework}
                homework={editingHomework}
                groups={initialGroups}
            />

            <AllHomeworkModal
                isOpen={isAllHomeworkModalOpen}
                onClose={handleCloseAllHomeworkModal}
                homeworks={allUndoneHomeworkSortedByDueDate}
                groups={initialGroups}
                onToggle={handleToggleComplete}
                onDelete={handleDelete}
                onEdit={handleUpdateHomework}
                onFollowToggle={handleFollowToggle}
                isAdmin={isAdmin}
            />
        </div>
    );
}