use bson::oid::ObjectId;
use serde::{Deserialize, Serialize, Deserializer};
use chrono::{DateTime, Utc};
use bson::DateTime as BsonDateTime;

#[derive(Debug, Deserialize)]
pub struct User {
    #[serde(rename = "notificationPreferences", default)]
    pub notification_preferences: Vec<NotificationPreference>,
    #[serde(rename = "pushSubscriptions", default)]
    pub push_subscriptions: Vec<PushSubscription>,
}
#[derive(Debug, Deserialize)]
pub struct NotificationPreference {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    #[serde(rename = "daysBefore")]
    pub days_before: i64,
    #[serde(rename = "timeOfDay")]
    pub time_of_day: String, // "HH:mm"
}

#[derive(Debug, Deserialize)]
pub struct ScheduledNotification {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    #[serde(rename = "jobId")]
    pub job_id: String,
    #[serde(rename = "userId")]
    pub user_id: ObjectId,
    pub title: String,
    pub body: String,
}

#[derive(Debug, Deserialize)]
pub struct HomeworkPayload {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub title: String,
    #[serde(rename = "dueDate", deserialize_with = "deserialize_flexible_date")]
    pub due_date: DateTime<Utc>,
    #[serde(rename = "userId")]
    pub user_id: ObjectId,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PushSubscription {
    pub endpoint: String,
    pub keys: SubscriptionKeys,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SubscriptionKeys {
    pub p256dh: String,
    pub auth: String,
}

#[derive(Debug, Deserialize)]
pub struct NotificationTask {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub title: String,
    pub body: String,
}

fn deserialize_flexible_date<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
where
    D: Deserializer<'de>,
{
    // Handle the data as a generic BSON value first
    let b = bson::Bson::deserialize(deserializer)?;

    match b {
        // Case 1: It's a BSON DateTime (Coming from MongoDB)
        bson::Bson::DateTime(dt) => Ok(dt.to_chrono()),

        // Case 2: It's a String (Coming from RabbitMQ/JSON)
        bson::Bson::String(s) => s.parse::<DateTime<Utc>>()
            .map_err(|e| serde::de::Error::custom(format!("Invalid date string: {}", e))),

        _ => Err(serde::de::Error::custom("Expected Date or ISO-8601 String")),
    }
}
