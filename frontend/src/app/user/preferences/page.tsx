'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { useViewPreferences } from '@/hooks/preferences/useViewPreferences';
import { usePushNotifications } from '@/hooks/preferences/usePushNotifications';
import { useNotificationRules } from '@/hooks/preferences/useNotificationRules';

import SubmitButton from "@/components/SubmitButton";
import { reqToApi } from "@/lib/utils";

export default function PreferencesPage() {
    const { data: session, status } = useSession();
    const [isInitializing, setIsInitializing] = useState(true);

    const {
        viewPreferences, setViewPreferences, saveViewPreferences,
        isSaving: isSavingViewPrefs, saveStatus: viewPrefsSaveStatus,
    } = useViewPreferences(session);

    const {
        isSubscribed, isSubscribing, error: pushError, subscribe, checkSubscriptionStatus
    } = usePushNotifications(session);

    const {
        rules: notificationPreferences, setRules: setNotificationPreferences,
        addRule, deleteRule, daysBefore, setDaysBefore, timeOfDay, setTimeOfDay,
    } = useNotificationRules(session);

    // --- Initialization ---
    useEffect(() => {
        if (status !== 'authenticated' || !session) {
            if (status !== 'loading') setIsInitializing(false);
            return;
        }

        const initialize = async () => {
            setIsInitializing(true);
            try {
                const res = await reqToApi('preferences', session);

                if (!res.ok) {
                    console.error('Failed to load preferences:', res.status, res.statusText);
                    return; // This jumps straight to 'finally'
                }

                const serverData = await res.json();

                if (serverData.viewPreferences) {
                    setViewPreferences(serverData.viewPreferences);
                }
                setNotificationPreferences(serverData.notificationPreferences || []);

                await checkSubscriptionStatus(serverData.pushSubscriptions || []);

            } catch (error) {
                console.error("Initialization Crash:", error);
            } finally {
                setIsInitializing(false);
            }
        };

        void initialize();
    }, [session, status, setViewPreferences, setNotificationPreferences, checkSubscriptionStatus]);


    const formatUtcToLocal = (utcTimeStr: string) => {
        if (!utcTimeStr) return '--:--';
        const date = new Date();
        const [hours, minutes] = utcTimeStr.split(':').map(Number);

        // Treat the inputs as UTC
        date.setUTCHours(hours, minutes, 0, 0);

        // formatting options
        return new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
    };

    if (status === 'loading' || isInitializing) return <div className="text-center p-10">Loading...</div>;
    if (status === 'unauthenticated') return <div className="text-center p-10">Please sign in.</div>;

    return (
        <main className="container mx-auto p-2">
            <h1 className="text-4xl font-bold mb-8">Preferences</h1>

            <div className="mb-8 p-6 border rounded-lg shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Homework Display Options</h2>
                <form onSubmit={saveViewPreferences}>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <label htmlFor="hidePastDueDays" className="mr-1">
                            Hide past-due homework older than
                        </label>

                        <div className="flex items-center gap-2">
                            <input
                                id="hidePastDueDays"
                                type="number"
                                value={viewPreferences.hidePastDueDays}
                                onChange={e => setViewPreferences(p => ({ ...p, hidePastDueDays: Number(e.target.value) }))}
                                min="0"
                                className="w-20 px-2 py-1 border rounded-md"
                            />
                            <span>days.</span>
                        </div>
                    </div>
                    <SubmitButton disabled={isSavingViewPrefs}>
                        {isSavingViewPrefs ? 'Saving...' : 'Save Display Settings'}
                    </SubmitButton>
                    {viewPrefsSaveStatus === 'success' && <span className="ml-4 text-green-600">Saved!</span>}
                </form>
            </div>

            <div className="mb-8 p-6 border rounded-lg shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Push Notifications</h2>
                {isSubscribed ? (
                    <p className="text-green-700 font-medium">✅ You are subscribed to push notifications.</p>
                ) : (
                    <div className="flex flex-col items-start gap-2">
                        <p>Enable browser notifications to get reminders.</p>
                        <button onClick={subscribe} disabled={isSubscribing} className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 disabled:bg-neutral-400 cursor-pointer">
                            {isSubscribing ? 'Subscribing...' : 'Enable Push Notifications'}
                        </button>
                        {pushError && <p className="text-red-500">{pushError}</p>}
                    </div>
                )}
            </div>

            <div className="p-6 border rounded-lg shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Alert Rules</h2>
                <form onSubmit={addRule} className="mb-6 p-4 rounded-md border">
                    <h3 className="text-lg font-medium mb-2">Add a New Alert Rule</h3>
                    <div className="flex flex-wrap items-center gap-4">
                        <span>Notify me</span>
                        <input type="number" value={daysBefore} onChange={e => setDaysBefore(Number(e.target.value))} min="0" className="w-20 px-2 py-1 border rounded-md" />
                        <span>day(s) before, at</span>
                        <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} className="px-2 py-1 border rounded-md" />
                        <SubmitButton className="py-1">Add Rule</SubmitButton>
                    </div>
                </form>

                <h3 className="text-lg font-medium mb-2">Your Current Rules</h3>
                <ul className="space-y-2">
                    {notificationPreferences.length > 0 ? notificationPreferences.map(pref => (
                        <li key={pref._id} className="flex justify-between items-center p-3 border rounded-md">
                            {/* We format the UTC time from DB back to Local time here */}
                            <span>Alert: <strong>{pref.daysBefore}</strong> day(s) before at <strong>{formatUtcToLocal(pref.timeOfDay)}</strong></span>
                            <button onClick={() => deleteRule(pref._id)} className="text-red-500 cursor-pointer hover:text-red-700 font-semibold">Delete</button>
                        </li>
                    )) : <p className="text-neutral-500">You have no alert rules set up.</p>}
                </ul>
            </div>
        </main>
    );
}