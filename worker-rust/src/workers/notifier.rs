use crate::models::{NotificationTask, User};
use anyhow::{anyhow, Context, Result};
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::Database;
use std::env;
use web_push::{
    ContentEncoding, IsahcWebPushClient, SubscriptionInfo, VapidSignatureBuilder,
    WebPushClient, WebPushMessageBuilder,
};

pub async fn send_single_notification(task: NotificationTask, db: &Database) -> Result<()> {
    let private_key = env::var("VAPID_PRIVATE_KEY").expect("VAPID_PRIVATE_KEY missing");
    let subject = env::var("VAPID_SUBJECT").expect("VAPID_SUBJECT missing");

    let user_oid = ObjectId::parse_str(&task.user_id).context("Invalid User ID")?;
    let users_collection = db.collection::<User>("users");

    let user = users_collection
        .find_one(doc! { "_id": user_oid })
        .await?
        .ok_or_else(|| anyhow!("User not found"))?;

    if user.push_subscriptions.is_empty() {
        println!("[Notifier] User {} has no subscriptions.", task.user_id);
        return Ok(());
    }

    let client = IsahcWebPushClient::new()?;

    for sub in user.push_subscriptions {
        let subscription_info = SubscriptionInfo::new(
            &sub.endpoint,
            &sub.keys.p256dh,
            &sub.keys.auth,
        );

        let mut sig_builder = VapidSignatureBuilder::from_base64(
            &private_key,
            &subscription_info,
        )?;

        sig_builder.add_claim("sub", subject.as_str());
        let signature = sig_builder.build()?;

        let payload_json = serde_json::json!({
            "title": task.title,
            "body": task.body,
        });
        let payload_string = payload_json.to_string();

        let mut builder = WebPushMessageBuilder::new(&subscription_info);
        builder.set_payload(ContentEncoding::Aes128Gcm, payload_string.as_bytes());
        builder.set_vapid_signature(signature);
        builder.set_ttl(24 * 60 * 60);

        let message = builder.build()?;

        match client.send(message).await {
            Ok(_) => println!("[Notifier] Push sent successfully!"),
            Err(e) => eprintln!("[Notifier] Push failed: {:?}", e),
        }
    }

    Ok(())
}