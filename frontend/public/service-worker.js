self.addEventListener('push', (event) => {
    const data = event.data.json(); // The data sent from our worker
    console.log('Push received:', data);

    const title = data.title || 'Homework Reminder';
    const options = {
        body: data.body,
        icon: '/icon-192x192.png', // Make sure you have an icon here
        badge: '/badge-72x72.png', // And a badge
    };

    // Show the notification
    event.waitUntil(self.registration.showNotification(title, options));
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // This can be used to focus the app's tab if it's open
    event.waitUntil(clients.openWindow('/'));
});