'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { X, Download, Copy, Check } from 'lucide-react';
import { ApiFile } from '@/types';
import { formatBytes } from '@/lib/utils';
import { FileIcon } from '../CoreComponents/Files/FileCell';

interface FileDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: ApiFile | null;
}

const LargeFilePreview = ({ file }: { file: ApiFile }) => {
    return (
        <div className="w-full max-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-100 dark:bg-neutral-800/50 rounded-md overflow-hidden">
            {file.mimetype.startsWith('image/') ? (
                <img src={file.url} alt={file.originalName} className="max-h-full max-w-full object-contain" />
            ) : (
                <div className="w-full h-full flex flex-col justify-center items-center">
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
            setTimeout(() => setIsCopiedURL(false), 2000); // Reset icon after 2 seconds
        }).catch(err => {
            console.error('Failed to copy URL: ', err);
        });
    };

    const handleCopyMarkdown = () => {
        navigator.clipboard.writeText(`![${file.originalName}](${encodeURI(file.url)})`).then(() => {
            setIsCopiedMarkdown(true);
            setTimeout(() => setIsCopiedMarkdown(false), 2000); // Reset icon after 2 seconds
        }).catch(err => {
            console.error('Failed to copy URL: ', err);
        });
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-lg bg-white dark:bg-neutral-900 border border-neutral-700 shadow-2xl">
                        {/* Header */}
                        <div className="flex-shrink-0 p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                            <DialogTitle className="text-lg font-semibold truncate" title={file.originalName}>
                                {file.originalName}
                            </DialogTitle>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-400/15">
                                <X className="h-5 w-5 text-neutral-500 hover:text-neutral-400" />
                            </button>
                        </div>

                        {/* --- THE FIX IS HERE --- */}
                        {/* Add min-h-0 to allow this flex item to shrink below its content's intrinsic size */}
                        <div className="flex-1 p-4 overflow-hidden min-h-0">
                            <LargeFilePreview file={file} />
                        </div>

                        {/* Footer (Details & Actions) */}
                        <div className="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-neutral-500">
                                <span>{formatBytes(file.size)}</span>
                                <span className="mx-2">&middot;</span>
                                <span>Uploaded on {new Date(file.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopyMarkdown}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-neutral-500/10 hover:bg-neutral-500/20 transition-colors"
                                >
                                    {isCopiedMarkdown ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    {isCopiedMarkdown ? 'Copied!' : 'Copy Markdown'}
                                </button>
                                <button
                                    onClick={handleCopyUrl}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-neutral-500/10 hover:bg-neutral-500/20 transition-colors"
                                >
                                    {isCopiedURL ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    {isCopiedURL ? 'Copied!' : 'Copy URL'}
                                </button>
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={file.originalName}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                    <Download size={16} />
                                    Download
                                </a>
                            </div>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </Transition>
    );
};