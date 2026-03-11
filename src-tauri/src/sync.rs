use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SyncAction {
    Create,
    Update,
    Delete,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum EntityType {
    Collection,
    Request,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SyncEvent {
    pub event_id: String,
    pub action: SyncAction,
    pub entity_type: EntityType,
    pub entity_id: String,
    // JSON representation of the entity payload
    pub payload: String,
    pub timestamp: String,
    pub origin_device: String,
}

// Helper to construct and serialize an event
impl SyncEvent {
    pub fn new(
        action: SyncAction,
        entity_type: EntityType,
        entity_id: String,
        payload: String,
        device: String,
    ) -> Self {
        Self {
            event_id: uuid::Uuid::new_v4().to_string(),
            action,
            entity_type,
            entity_id,
            payload,
            timestamp: chrono::Utc::now().to_rfc3339(),
            origin_device: device,
        }
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }
}
