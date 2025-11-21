import { formatBytes } from "@/lib/utils";
import { Archive, File as FileIconGeneric, FileAudio, FileImage, FileText, FileVideo, Trash2 } from "lucide-react";
import { ApiFile } from "@/types";
import Image from "next/image"

interface FileCellProps {
    file: ApiFile;
    onDelete: (fileId: string) => void;
    onCellClick: (file: ApiFile) => void; // New prop for opening the modal
}

// This component can be exported if used by the modal as well
export const FileIcon = ({ mimetype }: { mimetype: string }) => {
    const iconProps = { size: 48, className: "text-gray-500" };
    if (mimetype.startsWith('image/')) return <FileImage {...iconProps} />;
    if (mimetype.startsWith('video/')) return <FileVideo {...iconProps} />;
    if (mimetype.startsWith('audio/')) return <FileAudio {...iconProps} />;
    if (mimetype.startsWith('text/') || mimetype === 'application/pdf') return <FileText {...iconProps} />;
    if (mimetype === 'application/zip' || mimetype === 'application/x-rar-compressed') return <Archive {...iconProps} />;
    return <FileIconGeneric {...iconProps} />;
};

const FilePreview = ({ file }: { file: ApiFile }) => {
    if (file.mimetype.startsWith('image/')) {
        return (
            <img
                src={file.url}
                alt={file.originalName}
                className="w-full h-auto"
                loading="lazy"
            />
        );
    }
    return (
        <div className="aspect-square w-full h-full flex justify-center items-center bg-gray-100 dark:bg-neutral-800">
            <FileIcon mimetype={file.mimetype} />
        </div>
    );
};

export const FileCell = ({ file, onDelete, onCellClick }: FileCellProps) => {
    const handleDeleteClick = (e: React.MouseEvent) => {
        // Prevent the modal from opening when the delete button is clicked
        e.stopPropagation();
        onDelete(file._id);
    };

    return (
        <div
            onClick={() => onCellClick(file)} // Click anywhere on the cell to open the modal
            className="relative group border rounded-lg overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-lg break-inside-avoid cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCellClick(file)}
        >
            {/* Preview Area */}
            <div className="w-full bg-gray-50 dark:bg-neutral-800">
                <FilePreview file={file} />
            </div>

            {/* File Info */}
            <div className="p-3 border-t bg-white dark:bg-neutral-900/50">
                <p className="font-semibold text-sm truncate" title={file.originalName}>
                    {file.originalName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    {formatBytes(file.size)} &middot; {new Date(file.createdAt).toLocaleDateString()}
                </p>
            </div>

            {/* Delete button appears on hover in the corner */}
            <button
                onClick={handleDeleteClick}
                title="Delete File"
                className="absolute top-2 right-2 p-2 bg-red-600/70 rounded-full text-white backdrop-blur-sm hover:bg-red-600/90 transition-all scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                aria-label="Delete file"
            >
                <Trash2 size={16} />
            </button>

            {/* Optional: A subtle overlay on hover for better visibility of the delete button */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
        </div>
    );
};