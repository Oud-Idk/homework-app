import cron from 'node-cron';
import ScheduledNotification from './models/scheduledNotificaton.model.js';

export const startCleanupJob = () => {
    // This schedule runs at the beginning of every hour ('0 * * * *')
    cron.schedule('0 * * * *', () => {
        console.log('Running hourly check for expired notifications...');
        void ScheduledNotification.cleanupExpired();
    });

    console.log('Scheduled notification cleanup job has been set up.');
}; //asdf