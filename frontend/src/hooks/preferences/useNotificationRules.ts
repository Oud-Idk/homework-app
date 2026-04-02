import { useState, FormEvent } from 'react';
import { Session } from 'next-auth';
import {Methods, reqToApi} from '@/lib/utils';
import { useNotification } from "@/context/NotificationsContext";

export interface NotificationRule {
    _id: string;
    daysBefore: number;
    timeOfDay: string; // This will store UTC time string
}

export function useNotificationRules(session: Session | null) {
    const [rules, setRules] = useState<NotificationRule[]>([]);
    const [daysBefore, setDaysBefore] = useState(1);
    const [timeOfDay, setTimeOfDay] = useState('09:00'); // Keeps local time for the input

    const { showError } = useNotification();

    const toUTC = (localTime: string) => {
        if (!localTime) return '00:00';
        const date = new Date();
        const [hours, minutes] = localTime.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);

        const utcH = date.getUTCHours().toString().padStart(2, '0');
        const utcM = date.getUTCMinutes().toString().padStart(2, '0');
        return `${utcH}:${utcM}`;
    };

    const addRule = async (e: FormEvent) => {
        e.preventDefault();
        if (!session?.accessToken) return;

        try {
            // Convert to UTC before sending
            const utcTime = toUTC(timeOfDay);

            const newRuleData = {
                daysBefore: Number(daysBefore),
                timeOfDay: utcTime // Send UTC string to existing field
            };

            const res = await reqToApi('preferences/notifications', session, Methods.POST, newRuleData);
            if (!res.ok) throw new Error("Failed to add new rule.");

            const newRule = await res.json();
            setRules(current => [...current, newRule]);
        } catch (error) {
            console.error("Error adding notification rule:", error);
            showError("Failed to add the new rule.");
        }
    };

    const deleteRule = async (ruleId: string) => {
        if (!session?.accessToken) return;
        try {
            await reqToApi(`preferences/notifications/${ruleId}`, session, Methods.DELETE);
            setRules(current => current.filter(p => p._id !== ruleId));
        } catch (error) {
            console.error("Error deleting notification rule:", error);
            showError("Failed to delete the rule.");
        }
    };

    return {
        rules,
        setRules,
        addRule,
        deleteRule,
        daysBefore,
        setDaysBefore,
        timeOfDay,
        setTimeOfDay,
    };
}