use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    connect_async,
    tungstenite::protocol::Message,
    MaybeTlsStream, WebSocketStream,
};
use tokio_tungstenite::tungstenite::handshake::client::Response;
use tokio::sync::mpsc;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WsMessage {
    pub id: String,
    pub connection_id: String,
    pub content: String,
    pub is_sent: bool,
    pub timestamp: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct WsStatus {
    pub connection_id: String,
    pub status: String, // "connecting", "connected", "disconnected", "error"
    pub error: Option<String>,
}

pub struct WsConnection {
    pub tx: mpsc::UnboundedSender<Message>,
}

pub struct WsState {
    pub connections: Mutex<HashMap<String, WsConnection>>,
}

impl WsState {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }
}

use tokio_tungstenite::tungstenite::client::IntoClientRequest;

#[tauri::command]
pub async fn ws_connect(
    app: AppHandle,
    state: tauri::State<'_, WsState>,
    connection_id: String,
    url: String,
    headers: HashMap<String, String>,
) -> Result<(), String> {
    let mut request = url.into_client_request().map_err(|e| e.to_string())?;

    for (k, v) in headers {
        request.headers_mut().insert(
            http::HeaderName::from_bytes(k.as_bytes()).map_err(|e| e.to_string())?,
            http::HeaderValue::from_str(&v).map_err(|e| e.to_string())?
        );
    }

    let (ws_stream, _): (WebSocketStream<MaybeTlsStream<TcpStream>>, Response) = connect_async(request)
        .await
        .map_err(|e: tokio_tungstenite::tungstenite::Error| e.to_string())?;

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    {
        let mut conns = state.connections.lock().unwrap();
        conns.insert(connection_id.clone(), WsConnection { tx });
    }

    // Spawn sender task
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = ws_sender.send(msg).await {
                println!("WS Send error: {}", e);
                break;
            }
        }
    });

    // Spawn receiver task
    let conn_id_receiver = connection_id.clone();
    let app_receiver = app.clone();
    tokio::spawn(async move {
        let _ = app_receiver.emit("ws-status", WsStatus {
            connection_id: conn_id_receiver.clone(),
            status: "connected".to_string(),
            error: None,
        });

        while let Some(item) = ws_receiver.next().await {
            match item {
                Ok(msg) => {
                    if let Message::Text(text) = msg {
                        let ws_msg = WsMessage {
                            id: uuid::Uuid::new_v4().to_string(),
                            connection_id: conn_id_receiver.clone(),
                            content: text.to_string(),
                            is_sent: false,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                        };
                        let _ = app_receiver.emit("ws-message", ws_msg);
                    }
                }
                Err(e) => {
                    let _ = app_receiver.emit("ws-status", WsStatus {
                        connection_id: conn_id_receiver.clone(),
                        status: "error".to_string(),
                        error: Some(e.to_string()),
                    });
                    break;
                }
            }
        }

        let _ = app_receiver.emit("ws-status", WsStatus {
            connection_id: conn_id_receiver,
            status: "disconnected".to_string(),
            error: None,
        });
    });

    Ok(())
}

#[tauri::command]
pub fn ws_send(
    state: tauri::State<'_, WsState>,
    connection_id: String,
    content: String,
) -> Result<(), String> {
    let conns = state.connections.lock().unwrap();
    if let Some(conn) = conns.get(&connection_id) {
        conn.tx.send(Message::Text(content.into())).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Connection not found".to_string())
    }
}

#[tauri::command]
pub fn ws_disconnect(
    state: tauri::State<'_, WsState>,
    connection_id: String,
) -> Result<(), String> {
    let mut conns = state.connections.lock().unwrap();
    if let Some(conn) = conns.remove(&connection_id) {
        // Dropping the transmitter will cause the sender task to finish, 
        // which eventually leads to the connection closing.
        drop(conn); 
        Ok(())
    } else {
        Err("Connection not found".to_string())
    }
}
