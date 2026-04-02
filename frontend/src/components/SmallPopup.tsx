import { twMerge } from "tailwind-merge";
import React from "react";

export default function SmallPopup({ show, children, className }: {
    show: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={twMerge(
                `fixed left-1/2 bottom-2 bg-neutral-400/60 dark:bg-neutral-900/60 px-6 py-3 backdrop-blur-sm rounded-xl border
                transform -translate-x-1/2 transition-all duration-300 ease-in-out
                ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`, className,
            )}
        >
            {children}
        </div>
    )
}