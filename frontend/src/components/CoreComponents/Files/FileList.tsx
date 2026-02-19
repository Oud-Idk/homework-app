'use client';

import { ChangeEvent, FormEvent, Suspense, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from "next-auth/react";

import {Methods, reqToApi} from '@/lib/utils';
import { useNotification } from '@/context/NotificationsContext';
import { Pagination } from '../../Pagination';
import SubmitButton from "@/components/SubmitButton";

import { Search } from 'lucide-react';
import { FileCell } from "@/components/CoreComponents/Files/FileCell";
import { ApiFile } from "@/types";
import { FileDetailsModal } from "@/components/Modals/FileDetailsModal";
import { Title } from "@/components/EaseOfUse/Title";

const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
    <div className="flex justify-center items-center p-8">
        <p className="text-neutral-500 animate-pulse">{message}</p>
    </div>
);

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function FileManagerComponent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const { showError, showSuccess } = useNotification();

    const [files, setFiles] = useState<ApiFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);

    // Extract specific string values to use as dependencies
    const currentPageParam = searchParams.get('page');
    const searchParam = searchParams.get('search');
    const currentPage = parseInt(currentPageParam || '1', 10);

    // Initialize search state
    const [searchTerm, setSearchTerm] = useState(searchParam || '');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFileForModal, setSelectedFileForModal] = useState<ApiFile | null>(null);

    const handleOpenFileModal = (file: ApiFile) => {
        setSelectedFileForModal(file);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedFileForModal(null), 300);
    };

    // FIX 1: Only update URL if the search term actually changed relative to the URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        const currentUrlSearch = params.get('search') || '';

        // Prevent router loop: Only replace if value is different
        if (debouncedSearchTerm !== currentUrlSearch) {
            if (debouncedSearchTerm) {
                params.set('search', debouncedSearchTerm);
                params.set('page', '1');
            } else {
                params.delete('search');
            }
            router.replace(`${pathname}?${params.toString()}`);
        }
        // Remove searchParams from dependency, rely on internal conversion
    }, [debouncedSearchTerm, pathname, router]);

    // FIX 2: Fetch files only when specific params string changes, not the object
    const fetchFiles = useCallback(async () => {
        if (status !== 'authenticated') return;
        setIsDataLoading(true);

        const params = new URLSearchParams();
        if (currentPageParam) params.set('page', currentPageParam);
        if (searchParam) params.set('search', searchParam);
        params.set('limit', '12');

        try {
            const response = await reqToApi(`file?${params.toString()}`, session);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch files');
            }

            const data = await response.json();
            setFiles(data.files);
            setTotalPages(data.totalPages);
        } catch (err) {
            if (err instanceof Error) showError(err.message);
        } finally {
            setIsDataLoading(false);
        }
    }, [currentPageParam, searchParam, session, status, showError]);

    // Trigger the fetch
    useEffect(() => {
        void fetchFiles();
    }, [fetchFiles]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return showError("Please select a file to upload.");
        if (!session) return showError("Authentication error. Please log in again.");

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/file`, {
                method: Methods.POST,
                headers: { 'Authorization': `Bearer ${session.accessToken}` },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                // noinspection ExceptionCaughtLocallyJS
                throw new Error(errorData.message || 'File upload failed');
            }

            showSuccess("File uploaded successfully!");
            setSelectedFile(null);
            if (document.getElementById('file-upload-input')) {
                (document.getElementById('file-upload-input') as HTMLInputElement).value = '';
            }

            void fetchFiles(); // Re-use the fetch function

        } catch (err) {
            if (err instanceof Error) showError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return;
        if (!session) return showError("Authentication error. Please log in again.");

        const originalFiles = files;
        setFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));

        try {
            const response = await reqToApi(`file/${fileId}`, session, Methods.DELETE);

            if (!response.ok) {
                setFiles(originalFiles);
                const errorData = await response.json();
                // noinspection ExceptionCaughtLocallyJS
                throw new Error(errorData.message || 'Failed to delete the file');
            }
            showSuccess("File deleted successfully.");
        } catch (err) {
            if (err instanceof Error) showError(err.message);
            setFiles(originalFiles);
        }
    };

    if (status === 'loading') {
        return <div className="container mx-auto p-4 md:p-8"> <LoadingSpinner message="Authenticating..." /> </div>;
    }

    return (
        <>
            <div>
                <div className="mb-6">
                    <Title>File Manager</Title>
                </div>

                <div className="border p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-semibold mb-4">Upload a New File</h2>
                    <form onSubmit={handleUpload}>
                        <input id="file-upload-input" type="file" onChange={handleFileChange} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:text-sm file:font-semibold file:border-1 file:hover:bg-neutral-400/15 file:cursor-pointer" />
                        <SubmitButton disabled={!selectedFile || isUploading} className="mt-4">{isUploading ? 'Uploading...' : 'Upload'}</SubmitButton>
                    </form>
                </div>

                <div className="border p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">My Files</h2>
                        <div className="relative w-full max-w-xs">
                            <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by filename..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                        </div>
                    </div>

                    {isDataLoading ? (
                        <LoadingSpinner message="Loading files..." />
                    ) : files.length === 0 ? (
                        <p className="text-neutral-500 text-center py-8">
                            {searchParam ? `No files found for "${searchParam}".` : "You haven't uploaded any files yet."}
                        </p>
                    ) : (
                        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4">
                            {files.map(file => (
                                <div key={file._id} className="mb-4">
                                    <FileCell file={file} onDelete={handleDelete} onCellClick={handleOpenFileModal} />
                                </div>
                            ))}
                        </div>
                    )}
                    {totalPages > 1 && <Pagination totalPages={totalPages} currentPage={currentPage} />}
                </div>
            </div>
            <FileDetailsModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                file={selectedFileForModal}
            />
        </>
    );
}

export default function FileList() {
    return (
        <Suspense fallback={<LoadingSpinner message="Loading page..."/>}>
            <FileManagerComponent />
        </Suspense>
    );
}