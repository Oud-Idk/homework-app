"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function HomePageCTA() {
    const { data: session } = useSession();

    return (
        <>
            { session ? (
                <Link href="/homework-tracker" className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">Start Tracking Homework!</Link>
            ) : (
                <button onClick={() => signIn("google")} className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                    Log in!
                </button>
            )}
        </>
    )
}