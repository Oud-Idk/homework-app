// Exchanges
export const NOTIFICATION_EXCHANGE = 'notification_exchange';
export const EVENTS_EXCHANGE = 'events_exchange';

// Queues
export const QUEUES = {
    HOMEWORK_CREATED: 'homework_created_queue',
    PREFERENCE_CHANGED: 'preference_changed_queue',
    HOMEWORK_DELETED: 'homework_deleted_queue',
    HOMEWORK_DUE_NOTIFICATION: 'homework_due_notification_queue',
    POST_FANOUT: 'post_fanout_queue',
    POST_NOTIFICATION: 'post_notification_queue',
};

// Routing Keys
export const ROUTING_KEYS = {
    NOTIFICATION_SEND: 'notification.send',
    POST_CREATED: 'post.created',
};