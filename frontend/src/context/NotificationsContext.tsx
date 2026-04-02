"use client";

import React, { createContext, useState, useContext, useCallback, useRef, useEffect, ReactNode } from 'react'; // Import ReactNode
import SmallPopup from '../components/SmallPopup';

interface NotificationContextType {
    showError: (message: ReactNode) => void;   // CHANGED: string -> ReactNode
    showSuccess: (message: ReactNode) => void; // CHANGED: string -> ReactNode
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [message, setMessage] = useState<ReactNode>(''); // CHANGED: string -> ReactNode
    const [show, setShow] = useState(false);
    const [type, setType] = useState<'error' | 'success'>('error');
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    // The internal implementation doesn't need to change much, just the parameter type
    const showNotification = useCallback((msg: ReactNode, notificationType: 'error' | 'success', duration: number = 4000) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        setMessage(msg);
        setType(notificationType);
        setShow(true);

        timerRef.current = setTimeout(() => {
            setShow(false);
        }, duration);
    }, []);

    const showError = useCallback((msg: ReactNode) => {
        showNotification(msg, 'error');
    }, [showNotification]);

    const showSuccess = useCallback((msg: ReactNode) => {
        showNotification(msg, 'success', 3000);
    }, [showNotification]);


    const contextValue = { showError, showSuccess };

    const popupClassName = type === 'error'
        ? 'bg-red-400/60 dark:bg-red-900/60 border-red-500 z-999'
        : 'bg-green-400/60 dark:bg-green-900/60 border-green-500 z-999';

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            <SmallPopup show={show} className={popupClassName}>
                {message}
            </SmallPopup>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};