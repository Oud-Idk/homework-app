"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePageCTA() {
    const { data: session } = useSession();
    const [isEmotionalCrisisTime, setIsEmotionalCrisisTime] = useState(false);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 1 && hour < 8) {
            setIsEmotionalCrisisTime(true);
        }
    }, []);

    const crisisRoute = "/love";
    const crisisText = session ? "Seek Emotional Clarity" : "Read the Manifesto";

    return (
        <>
            {isEmotionalCrisisTime ? (
                <Link
                    href={crisisRoute}
                    className="cursor-pointer inline-block bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-[0_0_20px_rgba(219,39,119,0.5)] animate-pulse"
                >
                    {crisisText}
                </Link>
            ) : session ? (
                <Link
                    href="/homework-tracker"
                    className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    Start Tracking Homework!
                </Link>
            ) : (
                <button
                    onClick={() => signIn("google")}
                    className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    Log in!
                </button>
            )}
        </>
    );
}