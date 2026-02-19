'use client';

import {useMemo, useState} from 'react';
import {Group} from '@/types';
import {GroupNode, TreeNode} from './GroupNode';
import {InlineAddForm} from './InlineAddForm'; // Import the form
import {useSession} from "next-auth/react";
import {PlusCircle} from 'lucide-react';
import {Methods, reqToApi} from "@/lib/utils"; // Import an icon for the button

interface GroupExplorerProps {
    initialGroups: Group[];
}

function buildGroupTree(groups: Group[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();
    const tree: TreeNode[] = [];

    const normalizedGroups = groups.map(g => ({...g, parentId: g.parent}));

    normalizedGroups.forEach(group => {
        nodeMap.set(group._id, { ...group, children: [] });
    });

    nodeMap.forEach(node => {
        if (node.parent && nodeMap.has(node.parent)) {
            const parent = nodeMap.get(node.parent)!;
            parent.children.push(node);
        } else {
            tree.push(node);
        }
    });

    nodeMap.forEach(node => {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
    });
    tree.sort((a, b) => a.name.localeCompare(b.name));

    return tree;
}

export function GroupExplorer({ initialGroups }: GroupExplorerProps) {
    const { data: session } = useSession();
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [inlineAddParentId, setInlineAddParentId] = useState<string | null>(null);
    const [isAddingRoot, setIsAddingRoot] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null); // 1. State for editing

    const groupTree = useMemo(() => buildGroupTree(groups), [groups]);

    const handleGroupCreated = (newGroup: Group) => {
        setGroups(prevGroups => [...prevGroups, newGroup]);
        setInlineAddParentId(null);
        setIsAddingRoot(false);
    };

    const handleGroupDelete = async (groupId: string) => {
        const groupToDelete = groups.find(g => g._id === groupId);
        if (!groupToDelete) {
            console.error("Group to delete not found in local state.");
            return;
        }

        try {
            const res = await reqToApi(`groups/${groupId}`, session, Methods.DELETE)
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to delete group');
            }

            setGroups(prevGroups => {
                const pathRegex = new RegExp(`^${groupToDelete.path}`);
                return prevGroups.filter(g => !pathRegex.test(g.path));
            });

        } catch (error) {
            console.error('Error deleting group:', error);
            alert(`Error: Could not delete group. ${error instanceof Error ? error.message : ''}`);
        }
    };

    // 2. Handler to process the group update
    const handleGroupUpdate = async (groupId: string, newName: string) => {
        const groupToUpdate = groups.find(g => g._id === groupId);
        if (!groupToUpdate) {
            throw new Error("Group not found in local state.");
        }

        try {
            const res = await reqToApi(`groups/${groupId}`, session, Methods.PATCH, { name: newName });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to update group');
            }
            // const updatedGroupFromServer = await res.json();

            // To ensure UI consistency, we must update paths locally
            // This logic mimics the backend's path updates
            setGroups(prevGroups => {
                const oldPath = groupToUpdate.path;
                const newPath = groupToUpdate.parent
                    ? `${oldPath.substring(0, oldPath.lastIndexOf('/'))}/${newName}`
                    : newName;

                const oldPathRegex = new RegExp(`^${oldPath}`);

                return prevGroups.map(g => {
                    if (oldPathRegex.test(g.path)) {
                        const updatedPath = g.path.replace(oldPath, newPath);
                        if (g._id === groupId) {
                            // This is the group being renamed
                            return { ...g, name: newName, path: updatedPath };
                        } else {
                            // This is a descendant of the renamed group
                            return { ...g, path: updatedPath };
                        }
                    }
                    return g; // Not affected
                });
            });

            setEditingGroupId(null); // Close the edit form on success
        } catch (error) {
            console.error('Error updating group:', error);
            // Re-throw the error to be caught by the InlineEditForm
            throw error;
        }
    };


    // 3. Handlers to toggle editing state, ensuring only one form is open at a time
    const handleStartEdit = (nodeId: string) => {
        setEditingGroupId(nodeId);
        setInlineAddParentId(null);
        setIsAddingRoot(false);
    };

    const handleStartRootAdd = () => {
        setIsAddingRoot(true);
        setInlineAddParentId(null);
        setEditingGroupId(null);
    };

    const handleStartChildAdd = (nodeId: string) => {
        setInlineAddParentId(nodeId);
        setIsAddingRoot(false);
        setEditingGroupId(null);
    };

    return (
        <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-4 border-b pb-2 space-x-2">
                <h2 className="text-2xl font-semibold">Group Hierarchy</h2>
                <button
                    onClick={handleStartRootAdd}
                    className="flex items-center space-x-2 cursor-pointer text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                    <PlusCircle size={16} />
                    <span>Add Root Group</span>
                </button>
            </div>

            <div className="space-y-1">
                {isAddingRoot && (
                    <InlineAddForm
                        parentId={null}
                        level={0}
                        onCancel={() => setIsAddingRoot(false)}
                        onGroupCreated={handleGroupCreated}
                    />
                )}

                {groupTree.length > 0 ? (
                    groupTree.map(rootNode => (
                        <GroupNode
                            key={rootNode._id}
                            node={rootNode}
                            level={0}
                            activeInlineAddId={inlineAddParentId}
                            editingGroupId={editingGroupId} // 4. Pass down editing state and handlers
                            onStartInlineAdd={handleStartChildAdd}
                            onCancelInlineAdd={() => setInlineAddParentId(null)}
                            onGroupCreated={handleGroupCreated}
                            onDelete={handleGroupDelete}
                            onStartEdit={handleStartEdit}
                            onCancelEdit={() => setEditingGroupId(null)}
                            onGroupUpdate={handleGroupUpdate}
                        />
                    ))
                ) : (
                    !isAddingRoot && <p className="text-neutral-500">No groups found. Create one to get started!</p>
                )}
            </div>
        </div>
    );
}