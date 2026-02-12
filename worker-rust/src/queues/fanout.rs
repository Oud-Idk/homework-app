use anyhow::{Context, Result};
use bson::{doc, oid::ObjectId};
use futures::StreamExt;
use lapin::{options::BasicPublishOptions, BasicProperties, Channel};
use mongodb::{options::FindOptions, Database};
use serde::{Deserialize, Serialize};
use crate::constants::Queues;

#[derive(Debug, Deserialize)]
pub struct FanoutPayload {
    #[serde(rename = "homeworkId")]
    pub homework_id: String,
    pub title: String,
}
#[derive(Debug, Deserialize)]
pub struct Follow {
    pub user: ObjectId,
}
#[derive(Debug, Serialize)]
pub struct NotificationTask {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub title: String,
    pub body: String,
}
pub async fn fanout_post_notifications(
    payload: FanoutPayload,
    db: &Database,
    channel: &Channel,
) -> Result<()> {
    println!(
        "[Dispatcher] New post for \"{}\". Fanning out notifications.",
        payload.title
    );

    // 1. Parse string ID to MongoDB ObjectId
    let homework_oid = ObjectId::parse_str(&payload.homework_id)
        .context("Invalid homework_id format")?;

    // 2. Prepare MongoDB Query
    let collection = db.collection::<Follow>("follows");
    let filter = doc! { "homework": homework_oid };
    
    // Optimization: Select only the 'user' field (Project: { user: 1 })
    let find_options = FindOptions::builder()
        .projection(doc! { "user": 1 })
        .build();

    // 3. Execute Query
    let mut cursor = collection.find(filter).with_options(find_options).await?;

    // We can't easily check cursor.length without fetching all, 
    // so we just start streaming results.
    let mut count = 0;

    // 4. Iterate over followers asynchronously
    while let Some(result) = cursor.next().await {
        match result {
            Ok(follow) => {
                let follower_id_str = follow.user.to_hex();

                // Skip the author
                // if follower_id_str == payload.author_id {
                //     continue;
                // }

                // Prepare the task payload
                let task = NotificationTask {
                    user_id: follower_id_str,
                    title: format!("New Post in \"{}\"", payload.title),
                    body: "A new note or answer was just added.".to_string(),
                };

                // Serialize to JSON bytes
                let payload_bytes = serde_json::to_vec(&task)?;

                // 5. Publish to RabbitMQ
                let properties = BasicProperties::default().with_delivery_mode(2);

                channel
                    .basic_publish(
                        "".into(),
                        Queues::POST_NOTIFICATION.into(),
                        BasicPublishOptions::default(),
                        &payload_bytes,
                        properties,
                    )
                    .await?
                    .await?;

                count += 1;
            }
            Err(e) => eprintln!("[Dispatcher] Error reading document: {:?}", e),
        }
    }

    if count == 0 {
        println!("[Dispatcher]   - No followers (or only author). Task complete.");
    } else {
        println!(
            "[Dispatcher]   - Processed {} followers. Notification tasks created.",
            count
        );
    }

    Ok(())
}