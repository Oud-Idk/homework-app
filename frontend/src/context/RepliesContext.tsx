"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useReplies as useRepliesHook } from '@/hooks/feed/useReplies'; // The original hook

type RepliesContextType = ReturnType<typeof useRepliesHook>;

const RepliesContext = createContext<RepliesContextType | undefined>(undefined);

interface RepliesProviderProps {
    postId: string;
    children: ReactNode;
}

export const RepliesProvider = ({ postId, children }: RepliesProviderProps) => {
    const repliesData = useRepliesHook(postId);
    return (
        <RepliesContext.Provider value={repliesData}>
            {children}
        </RepliesContext.Provider>
    );
};

export const useRepliesContext = () => {
    const context = useContext(RepliesContext);
    if (context === undefined) {
        throw new Error('useRepliesContext must be used within a RepliesProvider');
    }
    return context;
};