use anyhow::{Context, Result};
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::Database;
use serde::{Deserialize, Serialize};

use crate::models::{HomeworkPayload, User};
use anyhow::{anyhow};
use bson::DateTime;
use mongodb::options::UpdateOptions;
use chrono::{Datelike, TimeZone, Timelike, Utc};
use futures::{TryStreamExt};
use futures::stream::{self, StreamExt};

#[derive(Debug, Deserialize)]
pub struct HomeworkDeletedPayload {
    #[serde(rename = "homeworkId")]
    pub homework_id: String,
}

#[derive(Debug, Deserialize)]
pub struct PreferencesChangedPayload {
    #[serde(rename = "userId")]
    pub user_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DueNotificationPayload {
    #[serde(rename = "jobId")]
    pub job_id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub title: String,
    pub body: String,
}

pub fn generate_job_id(homework_id: &str, pref_id: &str) -> String {
    format!("{}-{}", homework_id, pref_id)
}

pub async fn schedule_notifications_for_homework(
    homework: HomeworkPayload,
    provided_user: Option<&User>,
    db: &Database,
) -> Result<()> {
    println!("[Scheduler] Processing homework: \"{}\"", homework.title);

    let fetched_user; // This stores the user if we have to fetch it
    let user = match provided_user {
        Some(u) => u, // Use the one we already have
        None => {
            // Fetch from DB if not provided (Old behavior)
            let user_col = db.collection::<User>("users");
            fetched_user = user_col
                .find_one(doc! { "_id": &homework.user_id })
                .await?
                .ok_or_else(|| anyhow!("User not found"))?;
            &fetched_user
        }
    };

    if user.notification_preferences.is_empty() {
        return Ok(());
    }

    // 2. Setup Base Dates
    let now = Utc::now();
    // Start of today (00:00:00)
    let start_of_today = Utc
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .unwrap();

    let is_past_due = homework.due_date < start_of_today;
    let sched_col = db.collection::<bson::Document>("schedulednotifications");

    for pref in &user.notification_preferences {
        let job_id = generate_job_id(&homework.id.to_hex(), &pref.id.to_hex());

        if is_past_due {
            println!("[Scheduler]   - Skipped past-due alert for job {}", &job_id[..6]);
            sched_col.delete_one(doc! { "jobId": &job_id }).await?;
            continue;
        }

        // 3. Parse timeOfDay "HH:mm"
        let time_parts: Vec<&str> = pref.time_of_day.split(':').collect();
        if time_parts.len() != 2 { continue; }

        let hours: u32 = time_parts[0].parse().unwrap_or(0);
        let mins: u32 = time_parts[1].parse().unwrap_or(0);

        // 4. Calculate Notification Time
        // Logic: DueDate - daysBefore at specific HH:mm
        let notification_time = homework.due_date
            .checked_sub_signed(chrono::Duration::days(pref.days_before))
            .and_then(|dt| dt.with_hour(hours))
            .and_then(|dt| dt.with_minute(mins))
            .and_then(|dt| dt.with_second(0))
            .unwrap_or(homework.due_date);

        if notification_time < now {
            println!("[Scheduler] Skipping: Notification time ({}) is in the past.", notification_time.to_string());
            continue;
        }

        if notification_time > homework.due_date {
            println!("[Scheduler] Skipping: Notification ({}) is set for after the due date.", notification_time.to_string());
            continue;
        }

        // 5. Upsert into MongoDB
        let filter = doc! { "jobId": &job_id };
        let update = doc! {
            "$set": {
                "jobId": &job_id,
                "userId": homework.user_id,
                "homeworkId": homework.id,
                "sendAt": notification_time,
                "title": format!("Reminder: {}", homework.title),
                "body": format!("Your homework \"{}\" is due soon.", homework.title),
            }
        };
        let options = UpdateOptions::builder().upsert(true).build();

        sched_col.update_one(filter, update).with_options(options).await?;

        println!(
            "[Scheduler]   - Saved job {}... for {}",
            &job_id[..6],
            notification_time.to_rfc3339()
        );
    }

    Ok(())
}

pub async fn cancel_notifications_for_homework(
    payload: HomeworkDeletedPayload,
    db: &Database,
) -> Result<()> {
    let homework_oid = ObjectId::parse_str(&payload.homework_id)
        .context("Invalid homeworkId format")?;

    let collection = db.collection::<bson::Document>("schedulednotifications");

    let filter = doc! { "homeworkId": homework_oid };
    let result = collection.delete_many(filter).await?;

    println!(
        "[Scheduler] Cancelled {} notifications for homework: {}",
        result.deleted_count, payload.homework_id
    );

    Ok(())
}

pub async fn reschedule_all_notifications_for_user(
    payload: PreferencesChangedPayload,
    db: &Database,
) {
    println!("[Re-Scheduler] Received preferences changes for user: {}", payload.user_id);

    let user_col = db.collection::<User>("users");
    let user_obj_id = ObjectId::parse_str(&payload.user_id).unwrap();

    let user = match user_col.find_one(doc! { "_id": user_obj_id }).await {
        Ok(Some(u)) => u,
        _ => {
            println!("[Re-Scheduler] User not found, aborting.");
            return;
        }
    };

    let now = Utc::now();
    let start_of_today = Utc
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .unwrap();
    let uid_oid = ObjectId::parse_str(&payload.user_id).unwrap();

    let scheduled_notification_collection = db.collection::<bson::Document>("schedulednotifications");
    let scheduled_notification_filter = doc! { "userId": uid_oid, "sendAt": {"$gt": DateTime::now()} };

    let homework_collection = db.collection::<HomeworkPayload>("homeworks");
    let homework_filter = doc! { "userId": uid_oid, "dueDate": {"$gte": DateTime::from_chrono(start_of_today)} };

    let _ = scheduled_notification_collection.delete_many(scheduled_notification_filter).await;
    let active_homeworks = homework_collection.find(homework_filter).await.unwrap();
    let homework_list: Vec<HomeworkPayload> = active_homeworks
        .try_collect() // This pulls everything from the stream into a Vec
        .await
        .unwrap(); // Fails here

    println!("Found {} active homeworks to reschedule", homework_list.len());

    stream::iter(homework_list)
        .map(|hw| {
            let user_ref = &user;
            async move {
                schedule_notifications_for_homework(hw, Some(user_ref), db).await
            }
        })
        .buffer_unordered(10) // Run up to 10 DB operations concurrently
        .collect::<Vec<_>>()
        .await;
}