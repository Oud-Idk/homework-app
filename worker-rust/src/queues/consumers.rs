use crate::constants::Queues;
use crate::models::{HomeworkPayload, NotificationTask};
use crate::queues::fanout::{fanout_post_notifications, FanoutPayload};
use crate::workers::notifier::send_single_notification;
use crate::workers::scheduler::{
    cancel_notifications_for_homework, reschedule_all_notifications_for_user,
    schedule_notifications_for_homework, DueNotificationPayload, HomeworkDeletedPayload,
    PreferencesChangedPayload,
};
use futures::StreamExt;
use lapin::{options::BasicAckOptions, options::BasicConsumeOptions, types::FieldTable, Channel};
use mongodb::Database;

pub async fn setup_and_run_consumers(channel: Channel, db: Database) -> anyhow::Result<()> {
    // 1. Setup Consumers
    let mut fanout_consumer = channel
        .basic_consume(Queues::POST_FANOUT.into(), "rust_fanout".into(), BasicConsumeOptions::default(), FieldTable::default())
        .await?;

    let mut notify_consumer = channel
        .basic_consume(Queues::POST_NOTIFICATION.into(), "rust_notifier".into(), BasicConsumeOptions::default(), FieldTable::default())
        .await?;

    let mut delete_consumer = channel
        .basic_consume(Queues::HOMEWORK_DELETED.into(), "rust_deleter".into(), BasicConsumeOptions::default(), FieldTable::default())
        .await?;

    let mut create_consumer = channel
        .basic_consume(Queues::HOMEWORK_CREATED.into(), "rust_creator".into(), BasicConsumeOptions::default(), FieldTable::default())
        .await?;

    let mut preferences_consumer = channel
        .basic_consume(Queues::PREFERENCE_CHANGED.into(), "rust_preferences".into(), BasicConsumeOptions::default(), FieldTable::default())
        .await?;

    let mut homework_due_notification_consumer = channel
        .basic_consume(Queues::HOMEWORK_DUE_NOTIFICATION.into(), "rust_homework_due_notification".into(), BasicConsumeOptions::default(), FieldTable::default())
        .await?;

    // --- Helper for ACK ---
    let ack = |delivery: lapin::message::Delivery| async move {
        let _ = delivery.ack(BasicAckOptions::default()).await.map_err(|e| {
            eprintln!("[RabbitMQ] Failed to ACK: {}", e);
        });
    };

    // 1. Notification Worker (Direct Pushes)
    let db_c = db.clone();
    tokio::spawn(async move {
        while let Some(Ok(delivery)) = notify_consumer.next().await {
            match serde_json::from_slice::<NotificationTask>(&delivery.data) {
                Ok(task) => {
                    if let Err(e) = send_single_notification(task, &db_c).await {
                        eprintln!("[Notifier] Error sending push: {}", e);
                    }
                }
                Err(e) => eprintln!("[Notifier] Parsing error: {}\nRaw: {:?}", e, String::from_utf8_lossy(&delivery.data)),
            }
            ack(delivery).await;
        }
    });

    // 2. Deletion Worker
    let db_c = db.clone();
    tokio::spawn(async move {
        while let Some(Ok(delivery)) = delete_consumer.next().await {
            match serde_json::from_slice::<HomeworkDeletedPayload>(&delivery.data) {
                Ok(payload) => {
                    let _ = cancel_notifications_for_homework(payload, &db_c).await
                        .map_err(|e| eprintln!("[Deleter] DB Error: {}", e));
                }
                Err(e) => eprintln!("[Deleter] Parsing error: {}", e),
            }
            ack(delivery).await;
        }
    });

    // 3. Creation Worker
    let db_c = db.clone();
    tokio::spawn(async move {
        while let Some(Ok(delivery)) = create_consumer.next().await {
            match serde_json::from_slice::<HomeworkPayload>(&delivery.data) {
                Ok(homework) => {
                    let _ = schedule_notifications_for_homework(homework, None, &db_c).await
                        .map_err(|e| eprintln!("[Creator] Scheduling Error: {}", e));
                }
                Err(e) => eprintln!("[Creator] Parsing error: {}\nRaw: {:?}", e, String::from_utf8_lossy(&delivery.data)),
            }
            ack(delivery).await;
        }
    });

    // 4. Preferences Changed Worker
    let db_c = db.clone();
    tokio::spawn(async move {
        while let Some(Ok(delivery)) = preferences_consumer.next().await {
            // FIXED: You were previously trying to parse this as DueNotificationPayload first
            match serde_json::from_slice::<PreferencesChangedPayload>(&delivery.data) {
                Ok(payload) => {
                    reschedule_all_notifications_for_user(payload, &db_c).await;
                }
                Err(e) => eprintln!("[Preferences] Parsing error: {}\nRaw: {:?}", e, String::from_utf8_lossy(&delivery.data)),
            }
            ack(delivery).await;
        }
    });

    // 5. Homework Due Notification Worker (The "Trigger")
    let db_c = db.clone();
    tokio::spawn(async move {
        while let Some(Ok(delivery)) = homework_due_notification_consumer.next().await {
            match serde_json::from_slice::<DueNotificationPayload>(&delivery.data) {
                Ok(payload) => {
                    println!("[Notifier] Notification Triggered for job {}...", &payload.job_id[..6]);
                    let notification = NotificationTask {
                        user_id: payload.user_id,
                        title: payload.title,
                        body: payload.body,
                    };

                    if let Err(e) = send_single_notification(notification, &db_c).await {
                        eprintln!("[Notifier] Failed to send due-notification: {}", e);
                    }
                }
                Err(e) => eprintln!("[Notifier] Parsing error on DueNotification: {}", e),
            }
            ack(delivery).await;
        }
    });

    // 6. Fanout handler (Main blocking loop)
    println!("[Rust Worker] All consumers active.");
    while let Some(Ok(delivery)) = fanout_consumer.next().await {
        match serde_json::from_slice::<FanoutPayload>(&delivery.data) {
            Ok(payload) => {
                if let Err(e) = fanout_post_notifications(payload, &db, &channel).await {
                    eprintln!("[Fanout] Strategy error: {}", e);
                }
            }
            Err(e) => eprintln!("[Fanout] Parsing error: {}", e),
        }
        ack(delivery).await;
    }

    Ok(())
}