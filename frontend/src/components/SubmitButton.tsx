import React, { FormEvent } from "react";
import { twMerge } from "tailwind-merge";

interface SubmitButtonProps {
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
    onClick?: (e: FormEvent) => void;
}

export default function SubmitButton({ disabled, children, className, onClick }: SubmitButtonProps) {
    const baseClasses = `px-4 py-2 border 
        dark:border-indigo-400 dark:text-indigo-400
        text-indigo-600 border-indigo-600
        hover:bg-indigo-400/15
        rounded-md cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed`;

    return (
        <button
            type="submit"
            onClick={onClick}
            disabled={disabled ?? false}
            className={twMerge(baseClasses, className)}
        >
            {children}
        </button>
    )
}