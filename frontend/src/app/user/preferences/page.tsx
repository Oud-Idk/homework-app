'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

import { useViewPreferences } from '@/hooks/preferences/useViewPreferences';
import { usePushNotifications } from '@/hooks/preferences/usePushNotifications';
import { useNotificationRules } from '@/hooks/preferences/useNotificationRules';
import { useRelationshipSetter } from "@/hooks/people/useRelationshipSetter";

import SubmitButton from "@/components/SubmitButton";
import { reqToApi } from "@/lib/utils"; // Only keeping basic utils
import { SearchableSelect } from "@/components/Selector/SearchableSelect";
import { Classroom, User } from "@/types";
import { SearchableMultiSelect } from "@/components/Selector/SearchableMultiSelect";
import { Title } from "@/components/EaseOfUse/Title";

export default function PreferencesPage() {
    const { data: session, status } = useSession();
    const [isInitializing, setIsInitializing] = useState(true);
    const hasFetchedGlobalData = useRef(false);

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

    const {
        classes,
        currentClassId,

        // State buckets
        selectedInseparable, setSelectedInseparable,
        selectedGreatVibes, setSelectedGreatVibes,
        selectedGoodCompany, setSelectedGoodCompany,
        selectedPreferSpace, setSelectedPreferSpace,
        selectedNuclear, setSelectedNuclear,

        // Functions
        onChangeClassroom,
        saveRelationships,
        getAvailableStudents,

        // Status
        isLoadingRelationships,
        isSavingRelationships,
    } = useRelationshipSetter();

    // --- Global Initialization (Only for items not covered by specific hooks) ---
    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
            setIsInitializing(false);
            return;
        }
        if (hasFetchedGlobalData.current) return;

        const initialize = async () => {
            try {
                if (!session) return;
                const res = await reqToApi('preferences', session);
                if (!res.ok) return;

                const serverData = await res.json();
                if (serverData.viewPreferences) setViewPreferences(serverData.viewPreferences);
                setNotificationPreferences(serverData.notificationPreferences || []);
                await checkSubscriptionStatus(serverData.pushSubscriptions || []);

                hasFetchedGlobalData.current = true;
            } catch (error) {
                console.error("Initialization Crash:", error);
            } finally {
                setIsInitializing(false);
            }
        };

        void initialize();
    }, [status, setViewPreferences, setNotificationPreferences, checkSubscriptionStatus, session]);

    // UI Helper
    const formatUtcToLocal = (utcTimeStr: string) => {
        if (!utcTimeStr) return '--:--';
        const date = new Date();
        const [hours, minutes] = utcTimeStr.split(':').map(Number);
        date.setUTCHours(hours, minutes, 0, 0);
        return new Intl.DateTimeFormat(undefined, {
            hour: '2-digit', minute: '2-digit', hour12: false
        }).format(date);
    };

    const isSessionLoading = status === 'loading' && !session;

    if (isSessionLoading || isInitializing) {
        return <div className="text-center p-10">Loading...</div>;
    }

    if (status === 'unauthenticated') return <div className="text-center p-10">Please sign in.</div>;

    return (
        <main className="mx-auto space-y-4">
            <Title>Preferences</Title>

            {/* Display Options Section */}
            <div className="p-6 border rounded-lg shadow-sm">
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

            {/* Push Notifications Section */}
            <div className="p-6 border rounded-lg shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Push Notifications</h2>
                {isSubscribed ? (
                    <p className="text-green-700 font-medium">✅ You are subscribed to push notifications.</p>
                ) : (
                    <div className="flex flex-col items-start gap-2">
                        <p>Enable browser notifications to get reminders.</p>
                        <button
                            type="button"
                            onClick={subscribe}
                            disabled={isSubscribing}
                            className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 disabled:bg-neutral-400 cursor-pointer"
                        >
                            {isSubscribing ? 'Subscribing...' : 'Enable Push Notifications'}
                        </button>
                        {pushError && <p className="text-red-500">{pushError}</p>}
                    </div>
                )}
            </div>

            {/* Alert Rules Section */}
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
                            <span>Alert: <strong>{pref.daysBefore}</strong> day(s) before at <strong>{formatUtcToLocal(pref.timeOfDay)}</strong></span>
                            <button
                                type="button"
                                onClick={() => deleteRule(pref._id)}
                                className="text-red-500 cursor-pointer hover:text-red-700 font-semibold"
                            >
                                Delete
                            </button>
                        </li>
                    )) : <p className="text-neutral-500">You have no alert rules set up.</p>}
                </ul>
            </div>

            {/* Relationships Section */}
            <div className="p-6 border rounded-lg shadow-sm space-y-3">
                <h2 className="text-2xl font-semibold mb-4">My Relationships</h2>
                <form onSubmit={saveRelationships}>
                    <div className="flex gap-5 items-center mb-6">
                        <p>Classroom:</p>
                        <SearchableSelect<Classroom, string>
                            items={classes}
                            value={currentClassId}
                            onChange={onChangeClassroom}
                            getLabel={classroom => classroom.name}
                            getValue={classroom => classroom._id}
                        />
                    </div>

                    <div className={`grid grid-cols-[min-content_1fr] gap-x-5 gap-y-4 items-center mb-6 transition-opacity ${isLoadingRelationships ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <p className="whitespace-nowrap font-medium">Inseparable</p>
                        <SearchableMultiSelect<User>
                            items={getAvailableStudents(selectedInseparable)}
                            selected={selectedInseparable}
                            onChange={setSelectedInseparable}
                            getLabel={(s) => s.name}
                            getValue={(s) => s._id}
                            placeholder="Select people..."
                        />

                        <p className="whitespace-nowrap font-medium">Great Vibes</p>
                        <SearchableMultiSelect<User>
                            items={getAvailableStudents(selectedGreatVibes)}
                            selected={selectedGreatVibes}
                            onChange={setSelectedGreatVibes}
                            getLabel={(s) => s.name}
                            getValue={(s) => s._id}
                            placeholder="Select people..."
                        />

                        <p className="whitespace-nowrap font-medium">Good Company</p>
                        <SearchableMultiSelect<User>
                            items={getAvailableStudents(selectedGoodCompany)}
                            selected={selectedGoodCompany}
                            onChange={setSelectedGoodCompany}
                            getLabel={(s) => s.name}
                            getValue={(s) => s._id}
                            placeholder="Select people..."
                        />

                        <p className="whitespace-nowrap font-medium">Prefer Space</p>
                        <SearchableMultiSelect<User>
                            items={getAvailableStudents(selectedPreferSpace)}
                            selected={selectedPreferSpace}
                            onChange={setSelectedPreferSpace}
                            getLabel={(s) => s.name}
                            getValue={(s) => s._id}
                            placeholder="Select people..."
                        />

                        <p className="whitespace-nowrap font-medium">Mortal Enemies</p>
                        <SearchableMultiSelect<User>
                            items={getAvailableStudents(selectedNuclear)}
                            selected={selectedNuclear}
                            onChange={setSelectedNuclear}
                            getLabel={(s) => s.name}
                            getValue={(s) => s._id}
                            placeholder="Select people..."
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <SubmitButton disabled={isSavingRelationships || isLoadingRelationships}>
                            {isSavingRelationships ? 'Saving...' : 'Save Relationships'}
                        </SubmitButton>
                        {isLoadingRelationships && <span className="text-gray-500 text-sm">Loading classroom data...</span>}
                    </div>
                </form>
            </div>
        </main>
    );
}