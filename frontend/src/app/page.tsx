import { BookCheck, BellRing, LogIn, CheckCircle, LayoutGrid, MessageSquarePlus, SlidersHorizontal } from "lucide-react";
import HomePageCTA from "@/components/HomePageCTA";

export default async function HomePage() {
    return (
        // The only change is on this line: added min-height calculation and padding
        <main className="flex min-h-[calc(100vh-theme(spacing.18))] items-center justify-center p-4">
            <div className="w-full max-w-6xl p-8 space-y-8 backdrop-blur-sm border rounded-2xl shadow-2xl text-center">

                {/* Header with Icon */}
                <div className="flex flex-col items-center gap-4">
                    <BookCheck className="h-16 w-16 text-blue-400" />
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text p-2 bg-gradient-to-r from-blue-700 to-purple-800 dark:from-blue-400 dark:to-purple-500">
                        Welcome to TaskTrackr!
                    </h1>
                </div>

                {/* Subtitle */}
                <p className="text-lg leading-relaxed">
                    Your personal hub for tracking homework and deadlines. Never miss an assignment again.
                </p>

                {/* Feature List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
                    <div className="p-4 rounded-lg border">
                        <h3 className="font-semibold flex items-center gap-2">
                            <BellRing className="h-5 w-5 text-purple-500" />
                            Smart Notifications
                        </h3>
                        <p className="text-sm mt-1">
                            Get timely alerts before deadlines. Follow specific assignments to receive targeted updates and discussion notifications.
                        </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                        <h3 className="font-semibold flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-purple-500" />
                            Effortless Tracking
                        </h3>
                        <p className="text-sm mt-1">
                            Simply check off assignments as you complete them and watch your to-do list shrink. Stay on top of your progress with ease.
                        </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                        <h3 className="font-semibold flex items-center gap-2">
                            <MessageSquarePlus className="h-5 w-5 text-purple-500" />
                            Interactive Discussions
                        </h3>
                        <p className="text-sm mt-1">
                            Ask for help, share advice, and vote on useful posts. Threaded replies make it easy to follow conversations for each assignment.
                        </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                        <h3 className="font-semibold flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5 text-purple-500" />
                            Organized by Subject
                        </h3>
                        <p className="text-sm mt-1">
                            All your homework is neatly organized into groups by subject or class, making it simple to find what you need, when you need it.
                        </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                        <h3 className="font-semibold flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5 text-purple-500" />
                            Customizable Preferences
                        </h3>
                        <p className="text-sm mt-1">
                            Tailor your experience with personalized view settings and control exactly which notifications you want to receive.
                        </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                        <h3 className="font-semibold flex items-center gap-2">
                            <LogIn className="h-5 w-5 text-purple-500" />
                            Secure School Sign-In
                        </h3>
                        <p className="text-sm mt-1">
                            Access is exclusive to users with a <code className="text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-md text-xs font-jetbrains-mono">sekolahbim.sch.id</code> email.
                        </p>
                    </div>
                </div>

                <div className="pt-6">
                    <HomePageCTA />
                </div>
            </div>
        </main>
    );
}