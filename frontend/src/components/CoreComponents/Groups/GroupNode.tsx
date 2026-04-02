// components/GroupExplorer/GroupNode.tsx (Updated)
'use client';

import React, { useState } from 'react';
import { Group } from '@/types';
// 1. Import Pencil icon for editing
import { Folder, ChevronRight, ChevronDown, PlusCircle, Trash2, Pencil } from 'lucide-react';
import { InlineAddForm } from './InlineAddForm';
import { InlineEditForm } from './InlineEditForm'; // 2. Import the new edit form

export interface TreeNode extends Group {
    children: TreeNode[];
}

interface GroupNodeProps {
    node: TreeNode;
    level: number;
    activeInlineAddId: string | null;
    editingGroupId: string | null; // 3. Add prop to track editing state
    onStartInlineAdd: (nodeId: string) => void;
    onCancelInlineAdd: () => void;
    onGroupCreated: (newGroup: Group) => void;
    onDelete: (nodeId: string) => void;
    onStartEdit: (nodeId: string) => void; // 4. Add handlers for editing
    onCancelEdit: () => void;
    onGroupUpdate: (groupId: string, newName: string) => Promise<void>;
}

export function GroupNode({
                              node,
                              level,
                              activeInlineAddId,
                              editingGroupId,
                              onStartInlineAdd,
                              onCancelInlineAdd,
                              onGroupCreated,
                              onDelete,
                              onStartEdit,
                              onCancelEdit,
                              onGroupUpdate,
                          }: GroupNodeProps) {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = node.children.length > 0;
    const isEditing = editingGroupId === node._id; // 5. Check if this node is being edited

    const handleToggle = () => {
        if (hasChildren) {
            setIsOpen(!isOpen);
        }
    };

    const handleStartAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(true);
        onStartInlineAdd(node._id);
    };

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartEdit(node._id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${node.name}" and all its subgroups? This action cannot be undone.`)) {
            onDelete(node._id);
        }
    };

    const indentation = level * 8;

    return (
        <div>
            {/* 6. Conditionally render either the node display or the edit form */}
            {isEditing ? (
                <InlineEditForm
                    initialName={node.name}
                    level={level}
                    onCancel={onCancelEdit}
                    onSave={(newName) => onGroupUpdate(node._id, newName)}
                />
            ) : (
                <div
                    onClick={handleToggle}
                    className={`group flex items-center space-x-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ paddingLeft: `${indentation}px` }}
                >
                    <div className="w-4 h-4 flex items-center justify-center">
                        {hasChildren ? (isOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>) : null}
                    </div>
                    <Folder size={18} className="text-yellow-500"/>
                    <div className="flex-grow flex items-center space-x-2 truncate">
                        <span className="font-medium truncate">{node.name}</span>
                        <span className="text-xs text-neutral-500 pr-2 flex-shrink-0 hidden md:block">({node.path})</span>
                    </div>
                    <div className="flex items-center md:space-x-1 md:pr-2">
                        <button onClick={handleStartAdd} className="md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
                            <PlusCircle size={16} className="text-green-500"/>
                        </button>
                        <button onClick={handleStartEdit} className="md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
                            <Pencil size={16} className="text-blue-500"/>
                        </button>
                        <button onClick={handleDelete} className="md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
                            <Trash2 size={16} className="text-red-500"/>
                        </button>
                    </div>
                </div>
            )}

            {isOpen && (
                <div className="mt-1">
                    {node.children.map(childNode => (
                        <GroupNode
                            key={childNode._id}
                            node={childNode}
                            level={level + 1}
                            activeInlineAddId={activeInlineAddId}
                            editingGroupId={editingGroupId} // Pass down props
                            onStartInlineAdd={onStartInlineAdd}
                            onCancelInlineAdd={onCancelInlineAdd}
                            onGroupCreated={onGroupCreated}
                            onDelete={onDelete}
                            onStartEdit={onStartEdit} // Pass down props
                            onCancelEdit={onCancelEdit}
                            onGroupUpdate={onGroupUpdate}
                        />
                    ))}
                    {activeInlineAddId === node._id && (
                        <InlineAddForm
                            parentId={node._id}
                            level={level + 1}
                            onCancel={onCancelInlineAdd}
                            onGroupCreated={onGroupCreated}
                        />
                    )}
                </div>
            )}
        </div>
    );
}