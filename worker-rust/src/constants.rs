pub(crate) struct Queues;

impl Queues {
    pub(crate) const POST_FANOUT: &'static str = "post_fanout_queue";
    pub(crate) const POST_NOTIFICATION: &'static str = "post_notification_queue";
    pub(crate) const HOMEWORK_DELETED: &'static str = "homework_deleted_queue";
    pub(crate) const HOMEWORK_CREATED: &'static str = "homework_created_queue";
    pub(crate) const PREFERENCE_CHANGED: &'static str = "preference_changed_queue";
    pub(crate) const HOMEWORK_DUE_NOTIFICATION: &'static str = "homework_due_notification_queue";
}