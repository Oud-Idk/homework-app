import { ReactNode } from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

interface UserLayoutProps {
    children: ReactNode;
}

export default async function AdminLayout({ children }: UserLayoutProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/');
    }

    return (
        <>
            {children}
        </>
    );
}