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
        viewPreferences,
        setViewPreferences,
        saveViewPreferences,
        isSaving: isSavingViewPrefs,
        saveStatus: viewPrefsSaveStatus,
    } = useViewPreferences(session);

    const {
        isSubscribed,
        isSubscribing,
        error: pushError,
        subscribe,
        checkSubscriptionStatus
    } = usePushNotifications(session);

    const {
        rules: notificationPreferences,
        setRules: setNotificationPreferences,
        addRule,
        deleteRule,
        daysBefore,
        setDaysBefore,
        timeOfDay,
        setTimeOfDay,
    } = useNotificationRules(session);

    // Effect for initializing all preferences from the server
    useEffect(() => {
        if (status !== 'authenticated' || !session) {
            if (status !== 'loading') setIsInitializing(false);
            return;
        }

        const initialize = async () => {
            setIsInitializing(true);
            try {
                const res = await reqToApi('preferences', session);
                if (!res.ok) throw new Error('Failed to load preferences.');

                const serverData = await res.json();
                if (serverData.viewPreferences) {
                    setViewPreferences(serverData.viewPreferences);
                }
                setNotificationPreferences(serverData.notificationPreferences || []);
                await checkSubscriptionStatus(serverData.pushSubscriptions || []);

            } catch (error) {
                console.error("Initialization Error:", error);
            } finally {
                setIsInitializing(false);
            }
        };

        initialize();
    }, [session, status, setViewPreferences, setNotificationPreferences, checkSubscriptionStatus]);


    // --- Render Logic ---
    if (status === 'loading' || isInitializing) {
        return <div className="text-center p-10">Loading...</div>;
    }
    if (status === 'unauthenticated') {
        return <div className="text-center p-10">Please sign in to manage your preferences.</div>;
    }

    return (
        <main className="container mx-auto p-2">
            <h1 className="text-4xl font-bold mb-8">Preferences</h1>

            {/* View Preferences Form */}
            <div className="mb-8 p-6 border rounded-lg shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Homework Display Options</h2>
                <form onSubmit={saveViewPreferences}>
                    <p className="mb-4">Automatically hide old homework from your main list to keep it tidy.</p>
                    <div className="space-y-4">
                        {/* REMOVED: Hide Completed Days Input */}

                        <div className="flex items-center gap-4">
                            <label htmlFor="hidePastDueDays" className="flex-shrink-0">Hide past-due homework older than</label>
                            <input
                                id="hidePastDueDays" type="number"
                                value={viewPreferences.hidePastDueDays}
                                onChange={e => setViewPreferences(p => ({ ...p, hidePastDueDays: Number(e.target.value) }))}
                                min="0" className="w-20 px-2 py-1 border rounded-md"
                            />
                            <span>days.</span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                        <SubmitButton disabled={isSavingViewPrefs}>
                            {isSavingViewPrefs ? 'Saving...' : 'Save Display Settings'}
                        </SubmitButton>
                        {viewPrefsSaveStatus === 'success' && <p className="text-green-600">Settings saved successfully!</p>}
                        {viewPrefsSaveStatus === 'error' && <p className="text-red-600">Could not save settings.</p>}
                    </div>
                </form>
            </div>

            {/* Push Notifications Section */}
            <div className="mb-8 p-6 border rounded-lg shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Push Notifications</h2>
                {isSubscribed ? (
                    <p className="text-green-700 font-medium">✅ You are subscribed to push notifications on this device.</p>
                ) : (
                    <div>
                        <p className="mb-4">Enable browser notifications to get reminders directly on your device.</p>
                        <button onClick={subscribe} disabled={isSubscribing} className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 disabled:bg-neutral-400 cursor-pointer">
                            {isSubscribing ? 'Subscribing...' : 'Enable Push Notifications'}
                        </button>
                        {pushError && <p className="text-red-500 mt-2">{pushError}</p>}
                    </div>
                )}
            </div>

            <div className="p-6 border rounded-lg shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Email & Push Alert Rules</h2>
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
                            <span>Alert: <strong>{pref.daysBefore}</strong> day(s) before at <strong>{pref.timeOfDay}</strong></span>
                            <button onClick={() => deleteRule(pref._id)} className="text-red-500 cursor-pointer hover:text-red-700 font-semibold">Delete</button>
                        </li>
                    )) : <p className="text-neutral-500">You have no alert rules set up.</p>}
                </ul>
            </div>
        </main>
    );
}