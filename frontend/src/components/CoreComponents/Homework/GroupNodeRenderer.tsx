import React from "react";
import { Disclosure, DisclosureButton, DisclosurePanel, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Group, Homework } from "@/types";
import HomeworkItem from "@/components/CoreComponents/Homework/HomeworkItem";

interface GroupNode {
    groupDetails: Group;
    children: GroupNode[];
    homeworks: Homework[];
}

interface GroupNodeProps {
    node: GroupNode;
    isAdmin: boolean;
    handleDelete: (id: string) => void;
    handleToggleComplete: (id: string) => void;
    handleOpenEditModal: (hw: Homework) => void;
    handleFollowToggle: (homeworkId: string) => Promise<void>;
}

const GroupNodeRenderer: React.FC<GroupNodeProps> = ({
    node,
    isAdmin,
    handleDelete,
    handleToggleComplete,
    handleOpenEditModal,
    handleFollowToggle,
}) => {
    const hasContent = node.homeworks.length > 0 || node.children.some(child => child.homeworks.length > 0 || child.children.length > 0);

    if (!hasContent) {
        return null;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeHomeworks = node.homeworks.filter(hw => !hw.completed && new Date(hw.dueDate) >= startOfToday);
    const pastHomeworks = node.homeworks.filter(hw => hw.completed || new Date(hw.dueDate) < startOfToday);

    return (
        <Disclosure as="div" defaultOpen={true} className="border border-neutral-500 rounded-lg shadow-sm mt-2 md:mt-4">
            {({ open }) => (
                <>
                    <DisclosureButton className="w-full text-left flex justify-between items-center p-2">
                        <div className="flex gap-2 items-center">
                            <ChevronDownIcon
                                className={`${open ? '' : '-rotate-90'} h-5 w-5 text-indigo-500 transition-transform`}/>
                            <span className="font-semibold text-lg">
                                {node.groupDetails.name}
                            </span>
                        </div>
                        <span className="font-normal text-sm">
                            {activeHomeworks.length} active
                        </span>
                    </DisclosureButton>

                    <Transition enter="transition duration-100 ease-out" enterFrom="transform scale-95 opacity-0"
                                enterTo="transform scale-100 opacity-100" leave="transition duration-75 ease-out"
                                leaveFrom="transform scale-100 opacity-100" leaveTo="transform scale-95 opacity-0">
                        {/* Changed p-4.5 to p-2 for mobile, p-4 for desktop */}
                        <DisclosurePanel className="p-2 md:p-4 border-t border-neutral-500">
                            {/* Changed pl-4 to pl-2 for mobile to save width */}
                            <div className="pl-2 md:pl-4 border-l">
                                {activeHomeworks.length > 0 && (
                                    // Tighter vertical spacing on mobile
                                    <ul className="space-y-2 md:space-y-3">
                                        {activeHomeworks.map((hw) => (
                                            <HomeworkItem
                                                key={hw._id}
                                                homework={hw}
                                                onToggle={handleToggleComplete}
                                                onDelete={handleDelete} isAdmin={isAdmin}
                                                onEdit={handleOpenEditModal}
                                                onFollowToggle={handleFollowToggle}
                                            />
                                        ))}
                                    </ul>
                                )}

                                {pastHomeworks.length > 0 && activeHomeworks.length > 0 && <hr className="my-2 md:my-4"/>}

                                {pastHomeworks.length > 0 && (
                                    <ul className="space-y-2 md:space-y-3">
                                        {pastHomeworks.map((hw) => (
                                            <HomeworkItem
                                                key={hw._id}
                                                homework={hw}
                                                onToggle={handleToggleComplete}
                                                onDelete={handleDelete}
                                                isAdmin={isAdmin}
                                                onEdit={handleOpenEditModal}
                                                onFollowToggle={handleFollowToggle}
                                            />
                                        ))}
                                    </ul>
                                )}

                                <div className="space-y-1 md:space-y-2">
                                    {node.children.map(childNode => (
                                        <GroupNodeRenderer
                                            key={childNode.groupDetails._id}
                                            node={childNode}
                                            isAdmin={isAdmin}
                                            handleDelete={handleDelete}
                                            handleToggleComplete={handleToggleComplete}
                                            handleOpenEditModal={handleOpenEditModal}
                                            handleFollowToggle={handleFollowToggle}
                                        />
                                    ))}
                                </div>
                            </div>
                        </DisclosurePanel>
                    </Transition>
                </>
            )}
        </Disclosure>
    );
};

export default GroupNodeRenderer;