import React, { Fragment, ReactNode } from 'react';
import {
    Dialog,
    Transition,
    TransitionChild,






} from '@headlessui/react';
import { XIcon, ChevronsUpDownIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { MarkdownEditorRenderer } from "@/components/Markdown/MarkdownEditorRenderer";
import { Homework, Post } from '@/types';
import SubmitButton from "@/components/SubmitButton";
import { reqToApi } from "@/lib/utils";

interface ModalContainerProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode; // This should contain the DialogPanel
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
    isOpen,
    onClose,
    children,
}) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="duration-300"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        {children}
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
};