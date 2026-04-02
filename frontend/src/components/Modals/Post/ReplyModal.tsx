"use client";

import React from 'react';
import { DialogPanel, DialogTitle } from '@headlessui/react';
import { Post } from '@/types';
import { ReplyForm } from '@/components/Forms/ReplyForm';
import { XIcon } from 'lucide-react';
import { ModalContainer } from "@/components/Modals/ModalContainer";

interface ReplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    postToReplyTo: Post;
}

export const ReplyModal: React.FC<ReplyModalProps> = ({isOpen, onClose, postToReplyTo}) => {
    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>

            <DialogPanel className="w-full max-w-lg space-y-4 rounded-lg bg-black p-6 border border-neutral-800">
                <div className="flex justify-between items-center">
                    <DialogTitle className="text-lg font-semibold">
                        Replying to {postToReplyTo.author.name}
                    </DialogTitle>
                    <XIcon onClick={onClose} className="h-6 w-6 cursor-pointer text-neutral-400"/>
                </div>

                <p className="text-sm text-neutral-400 border-l-2 border-neutral-700 pl-3 line-clamp-2">
                    {postToReplyTo.content}
                </p>

                <ReplyForm postId={postToReplyTo._id} onReplyCreated={onClose}/>
            </DialogPanel>
        </ModalContainer>
    );
};