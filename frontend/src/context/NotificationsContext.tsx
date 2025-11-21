"use client";

import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import SmallPopup from '../components/SmallPopup';

interface NotificationContextType {
    showError: (message: string) => void;
    showSuccess: (message: string) => void; // Let's add a success one too!
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [message, setMessage] = useState('');
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

    const showNotification = useCallback((msg: string, notificationType: 'error' | 'success', duration: number = 4000) => {
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

    const showError = useCallback((msg: string) => {
        showNotification(msg, 'error');
    }, [showNotification]);

    const showSuccess = useCallback((msg: string) => {
        showNotification(msg, 'success', 3000); // Success messages can be shorter
    }, [showNotification]);


    const contextValue = { showError, showSuccess };

    const popupClassName = type === 'error'
        ? 'bg-red-400/60 dark:bg-red-900/60 border-red-500'
        : 'bg-green-400/60 dark:bg-green-900/60 border-green-500';

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