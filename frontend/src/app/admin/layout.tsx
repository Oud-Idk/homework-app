import { ReactNode } from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

interface AdminLayoutProps {
    children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
        redirect('/');
    }

    return (
        <>
            {children}
        </>
    );
}