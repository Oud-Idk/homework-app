import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/context/SessionContext";
import ThemeProvider from "@/context/ThemeContext";
import Navbar from "@/components/Navbar/Navbar";
import { Inter, JetBrains_Mono } from "next/font/google";
import React from "react";
import { NotificationProvider } from "@/context/NotificationsContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", style: ['normal', 'italic'] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", style: ['normal', 'italic'] });

export const metadata: Metadata = {
    title: "Homework App",
    description: "An app to track homework-tracker.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="scrollbar-thin" suppressHydrationWarning>
        <body
            className={`${inter.className} ${inter.variable} ${jetbrainsMono.variable} h-dvh flex flex-col overflow-hidden antialiased bg-white dark:bg-black`}
        >
        <SessionProvider>
            <ThemeProvider>
                <NotificationProvider>
                    <Navbar />
                    <div className="flex-1 overflow-y-auto p-4 relative">
                        {children}
                    </div>
                </NotificationProvider>
            </ThemeProvider>
        </SessionProvider>
        </body>
        </html>
    );
}