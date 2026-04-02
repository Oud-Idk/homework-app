'use client';

import { ThemeProvider as TP } from 'next-themes';
import { type ReactNode } from 'react';

export default function ThemeProvider({ children }: { children: ReactNode }) {
    return (
        <TP attribute="class" defaultTheme="system" enableSystem>
            {children}
        </TP>
    );
}