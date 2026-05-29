mod models;
mod queues;
mod workers;
mod constants;

use anyhow::{Context, Result};
use dotenvy::dotenv;
use mongodb::{Client, Database};
use std::env;
use bson::{doc};
use futures::stream::TryStreamExt;
use lapin::{options::{ExchangeDeclareOptions, QueueBindOptions, QueueDeclareOptions}, types::FieldTable, ExchangeKind, Channel, BasicProperties, Connection, ConnectionProperties};
use lapin::options::BasicPublishOptions;
use crate::constants::{Exchanges, Queues, RoutingKeys};
use crate::models::ScheduledNotification;
use crate::queues::consumers;
use crate::workers::scheduler::DueNotificationPayload;

async fn check_db_for_due_notifications(channel: Channel, db: Database) -> Result<()> {
    let now = chrono::Utc::now();
    let filter = doc! {"sendAt": {"$lte": now}};
    let due_notifications_cursor = db
        .collection::<ScheduledNotification>("schedulednotifications")
        .find(filter)
        .await?;

    let notifications: Vec<ScheduledNotification> = due_notifications_cursor.try_collect().await?;
    let notifications_length = notifications.len();
    println!("Polling for Notifications");

    if notifications_length > 0 {
        println!("[Poller] Found {} due notification(s).", notifications_length);
    }

    let mut notifications_to_delete: Vec<bson::oid::ObjectId> = Vec::new();

    for notification in notifications {
        notifications_to_delete.push(notification.id.clone());

        println!("[Poller] Processing job {}...", notification.job_id.get(..6).unwrap_or(&notification.job_id));
        let payload = DueNotificationPayload {
            job_id: notification.job_id,
            user_id: notification.user_id.to_string(),
            title: notification.title,
            body: notification.body,
        };

        let payload_bytes = serde_json::to_vec(&payload)?;

        channel.basic_publish(
            "".into(),
            Queues::HOMEWORK_DUE_NOTIFICATION.into(),
            BasicPublishOptions::default(),
            &payload_bytes,
            BasicProperties::default(),
        )
            .await?
            .await?;
    }

    if !notifications_to_delete.is_empty() {
        let delete_filter  = doc! { "_id": {"$in": notifications_to_delete} };
        let res = db.collection::<ScheduledNotification>("schedulednotifications")
            .delete_many(delete_filter)
            .await?;
        println!("[Poller] Deleted {} due notifications.", res.deleted_count);
    }

    Ok(())
}

async fn run_poller(channel: Channel, db: Database) -> Result<()> {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(10));
    println!("[Poller] Starting poller");

    loop {
        interval.tick().await;

        if let Err(err) = check_db_for_due_notifications(channel.clone(), db.clone()).await {
            println!("[Poller] Error checking due notifications. {:#?}", err);
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    let mongo_uri = env::var("MONGO_URI").context("MONGO_URI must be set")?;
    let mongo_client = Client::with_uri_str(&mongo_uri).await?;
    let db = mongo_client.database("homeworkapp");

    let amqp_addr = env::var("RABBITMQ_URL").unwrap_or_else(|_| "amqp://127.0.0.1:5672/%2f".into());
    let conn = Connection::connect(&amqp_addr, ConnectionProperties::default()).await?;
    let channel = conn.create_channel().await?;

    println!("[Rust Worker] Connected to RabbitMQ and MongoDB.");

    channel.exchange_declare(
        Exchanges::NOTIFICATION_EXCHANGE.into(),
        ExchangeKind::Direct,
        ExchangeDeclareOptions { durable: true, ..Default::default() },
        FieldTable::default(),
    ).await?;

    // Events Exchange (Topic)
    channel.exchange_declare(
        Exchanges::EVENTS_EXCHANGE.into(),
        ExchangeKind::Topic,
        ExchangeDeclareOptions { durable: true, ..Default::default() },
        FieldTable::default(),
    ).await?;

    // --- 2. Setup Queues ---
    let queue_list = [
        Queues::POST_FANOUT,
        Queues::POST_NOTIFICATION,
        Queues::HOMEWORK_DELETED,
        Queues::HOMEWORK_CREATED,
        Queues::PREFERENCE_CHANGED,
        Queues::HOMEWORK_DUE_NOTIFICATION,
    ];

    for queue_name in queue_list {
        channel.queue_declare(
            queue_name.into(),
            QueueDeclareOptions { durable: true, ..Default::default() },
            FieldTable::default(),
        ).await?;
    }

    channel.queue_bind(
        Queues::HOMEWORK_DUE_NOTIFICATION.into(),
        Exchanges::NOTIFICATION_EXCHANGE.into(),
        RoutingKeys::NOTIFICATION_SEND.into(),
        QueueBindOptions::default(),
        FieldTable::default(),
    ).await?;

    // Bind Post Fanout to Events Exchange
    channel.queue_bind(
        Queues::POST_FANOUT.into(),
        Exchanges::EVENTS_EXCHANGE.into(),
        RoutingKeys::POST_CREATED.into(),
        QueueBindOptions::default(),
        FieldTable::default(),
    ).await?;

    println!("[RabbitMQ] Topology asserted (Exchanges, Queues, and Bindings).");

    let poller_channel = channel.clone();
    let poller_db = db.clone();

    tokio::spawn(async move {
        run_poller(poller_channel, poller_db).await.expect("Poller panicked!");
    });

    // Call the moved logic
    consumers::setup_and_run_consumers(channel, db).await?;

    Ok(())
}