import { useState, FormEvent } from 'react';
import { Session } from 'next-auth';
import { reqToApi } from '@/lib/utils';
import { useNotification } from "@/context/NotificationsContext";

export interface NotificationRule {
    _id: string;
    daysBefore: number;
    timeOfDay: string;
}

export function useNotificationRules(session: Session | null) {
    const [rules, setRules] = useState<NotificationRule[]>([]);
    const [daysBefore, setDaysBefore] = useState(1);
    const [timeOfDay, setTimeOfDay] = useState('09:00');

    const { showError } = useNotification();

    const addRule = async (e: FormEvent) => {
        e.preventDefault();
        if (!session?.accessToken) return;

        try {
            const newRuleData = { daysBefore: Number(daysBefore), timeOfDay };
            const res = await reqToApi('preferences/notifications', session, 'POST', newRuleData);
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
            await reqToApi(`preferences/notifications/${ruleId}`, session, "DELETE");
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