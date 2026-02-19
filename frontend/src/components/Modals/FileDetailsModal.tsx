'use client';

import React, { useState } from 'react';
import { DialogPanel, DialogTitle } from '@headlessui/react';
import { Download, Copy, Check, X } from 'lucide-react';
import { ApiFile } from '@/types';
import { formatBytes } from '@/lib/utils';
import { FileIcon } from '../CoreComponents/Files/FileCell';
import { ModalContainer } from "@/components/Modals/ModalContainer";

interface FileDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: ApiFile | null;
}

const LargeFilePreview = ({ file }: { file: ApiFile }) => {
    return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {file.mimetype.startsWith('image/') ? (
                <img
                    src={file.url}
                    alt={file.originalName}
                    className="max-h-full max-w-full object-contain"
                />
            ) : (
                <div className="flex flex-col justify-center items-center p-10">
                    <FileIcon mimetype={file.mimetype} />
                    <p className="mt-4 text-lg text-neutral-500">{file.originalName}</p>
                </div>
            )}
        </div>
    );
};

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({ isOpen, onClose, file }) => {
    const [isCopiedURL, setIsCopiedURL] = useState(false);
    const [isCopiedMarkdown, setIsCopiedMarkdown] = useState(false);

    if (!file) return null;

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(encodeURI(file.url)).then(() => {
            setIsCopiedURL(true);
            setTimeout(() => setIsCopiedURL(false), 2000);
        }).catch(err => {
            console.error('Failed to copy URL: ', err);
        });
    };

    const handleCopyMarkdown = () => {
        navigator.clipboard.writeText(`![${file.originalName}](${encodeURI(file.url)})`).then(() => {
            setIsCopiedMarkdown(true);
            setTimeout(() => setIsCopiedMarkdown(false), 2000);
        }).catch(err => {
            console.error('Failed to copy Markdown: ', err);
        });
    };

    // Shared button style
    const buttonBaseClass = "flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors";
    const secondaryBtnClass = `${buttonBaseClass} border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800`;

    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <DialogPanel className="max-w-4xl mt-12 w-full space-y-4 border bg-white dark:bg-black p-6 rounded-lg shadow-xl relative">

                {/* Header with Title and X button */}
                <div className="flex justify-between items-start">
                    <DialogTitle className="text-xl font-semibold truncate pr-8" title={file.originalName}>
                        {file.originalName}
                    </DialogTitle>
                    <button
                        onClick={onClose}
                        className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="h-[calc(100vh-300px)] max-h-[600px] w-full flex flex-col">
                    <LargeFilePreview file={file} />
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        <span>{formatBytes(file.size)}</span>
                        <span className="mx-2">&middot;</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                            onClick={handleCopyMarkdown}
                            className={secondaryBtnClass}
                        >
                            {isCopiedMarkdown ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            {isCopiedMarkdown ? 'Copied' : 'MD'}
                        </button>

                        <button
                            onClick={handleCopyUrl}
                            className={secondaryBtnClass}
                        >
                            {isCopiedURL ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            {isCopiedURL ? 'Copied' : 'URL'}
                        </button>

                        <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.originalName}
                            className={`${buttonBaseClass} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`}
                        >
                            <Download size={16} />
                            Download
                        </a>
                    </div>
                </div>
            </DialogPanel>
        </ModalContainer>
    );
};