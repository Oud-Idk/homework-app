import React, { FormEvent } from "react";
import { twMerge } from "tailwind-merge";

interface SubmitButtonProps {
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
    onClick?: (e: FormEvent) => void;
}

export default function SubmitButton({ disabled, children, className, onClick }: SubmitButtonProps) {
    const baseClasses = `px-3 py-1.5 border 
        border-indigo-500 text-indigo-500
        hover:bg-neutral-500/10
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