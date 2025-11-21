import { useState, FormEvent } from 'react';
import { Session } from 'next-auth';
import { reqToApi } from '@/lib/utils';
import { useNotification } from "@/context/NotificationsContext";

export interface ViewPreferences {
    hideCompletedDays: number;
    hidePastDueDays: number;
}

const defaultPreferences: ViewPreferences = {
    hideCompletedDays: 7,
    hidePastDueDays: 30,
};

export function useViewPreferences(session: Session | null) {
    const { showError, showSuccess } = useNotification();

    const [viewPreferences, setViewPreferences] = useState<ViewPreferences>(defaultPreferences);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

    const saveViewPreferences = async (e?: FormEvent) => {
        e?.preventDefault();
        if (!session?.accessToken) return;

        setIsSaving(true);
        setSaveStatus(null);
        try {
            const res = await reqToApi('preferences/view', session, "PUT", viewPreferences);
            if (!res.ok) throw new Error('Failed to save settings.');

            showSuccess('Display settings saved successfully!');
        } catch (error) {
            console.error(error);
            showError('Could not save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        viewPreferences,
        setViewPreferences, // Exposed to set initial state after fetching
        saveViewPreferences,
        isSaving,
        saveStatus,
    };
}