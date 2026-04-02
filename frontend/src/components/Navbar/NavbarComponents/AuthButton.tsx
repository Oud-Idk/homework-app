"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div className="h-9 w-24 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse" />;
    }

    if (session) {
        return (
            <button
                onClick={() => signOut()}
                className="-mx-3 block rounded-lg px-3 text-base/7 hover:bg-neutral-400/25 hover:transition-colors"
            >
                Sign Out
            </button>
        );
    }

    return (
        <button
            onClick={() => signIn("google")}
            className="-mx-3 block rounded-lg px-3 text-base/7 hover:bg-neutral-400/25 hover:transition-colors"
        >
            Sign In
        </button>
    );
}

export const AuthButtonDesktop = () => {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div className="h-8 w-20 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse" />;
    }

    if (session) {
        return (
            <>
                <button
                    onClick={() => signOut()}
                    className="text-md text-neutral-900 cursor-pointer hover:transition-colors dark:text-white hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80 px-4 py-2 rounded-md"
                >
                    Sign Out
                </button>
            </>
        );
    }

    return (
        <>
            <button
                onClick={() => signIn("google")}
                className="text-md text-neutral-900 cursor-pointer hover:transition-colors dark:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/80 px-4 py-2 rounded-md"
            >
                Sign In
            </button>
        </>
    );
};