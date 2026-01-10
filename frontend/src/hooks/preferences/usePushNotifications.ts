import { useState, useCallback } from 'react';
import { Session } from 'next-auth';
import { reqToApi, urlBase64ToUint8Array } from '@/lib/utils';
import { useNotification } from "@/context/NotificationsContext";

interface ServerPushSubscription {
    endpoint: string;
}

export function usePushNotifications(session: Session | null) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [error] = useState<string | null>(null);
    const { showError } = useNotification();

    const checkSubscriptionStatus = useCallback(async (serverSubscriptions: ServerPushSubscription[] = []) => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log("Push notifications not supported by this browser.");
            setIsSubscribed(false);
            return; // Exit early if the browser doesn't support it
        }

        try {
            // Use getRegistration() which does not hang
            const registration = await navigator.serviceWorker.getRegistration();

            // If there is no registration, the user is definitely not subscribed.
            if (!registration) {
                setIsSubscribed(false);
                return;
            }

            // If registration exists, now we can check for a subscription.
            const localSubscription = await registration.pushManager.getSubscription();

            if (localSubscription) {
                // Check if this local subscription is known by our server
                const isSubscriptionOnServer = serverSubscriptions.some(
                    (serverSub) => serverSub.endpoint === localSubscription.endpoint
                );
                setIsSubscribed(isSubscriptionOnServer);
            } else {
                setIsSubscribed(false);
            }
        } catch (err) {
            console.error("Error checking push subscription status:", err);
            setIsSubscribed(false);
        }
    }, []);

    const subscribe = async () => {
        if (!session?.accessToken) {
            showError("Access token not set.");
            return;
        }
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
            showError("Public VAPID key is not set.");
            return;
        }
        setIsSubscribing(true);

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission was not granted.');
            }

            // 1. Register the service worker
            await navigator.serviceWorker.register('/service-worker.js');

            const registration = await navigator.serviceWorker.ready;
            const applicationServerKey = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

            // 3. Now that the worker is active, subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            const res = await reqToApi('subscriptions', session, 'POST', subscription);
            if (!res.ok) throw new Error("Failed to save subscription on the server.");

            setIsSubscribed(true);
        } catch (err) {
            console.error("Error subscribing to push notifications:", err);
            showError((err as Error).message || "Failed to subscribe. Please try again.");
        } finally {
            setIsSubscribing(false);
        }
    };

    return {
        isSubscribed,
        isSubscribing,
        error,
        subscribe,
        checkSubscriptionStatus,
    };
}