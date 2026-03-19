use crate::sync::SyncEvent;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tauri::Emitter;

const SERVICE_TYPE: &str = "_localman._tcp.local.";
const STALE_PEER_SECONDS: u64 = 12;

#[derive(Clone)]
pub struct KnownPeer {
    pub ip_address: String,
    pub last_seen_unix: u64,
}

pub struct NetworkState {
    pub daemon: ServiceDaemon,
    pub known_peers: Arc<Mutex<HashMap<String, KnownPeer>>>, // instance_name -> peer data
}

#[derive(serde::Serialize, Clone)]
pub struct PeerFoundEvent {
    pub instance_name: String,
    pub ip_address: String,
}

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    routing::get,
    Router,
};

pub fn start_mdns(
    app: AppHandle,
    instance_name: String,
    port: u16,
) -> Result<NetworkState, String> {
    // START WS SERVER
    let app_clone = app.clone();
    tokio::spawn(async move {
        let app_for_route = app_clone.clone();
        let app_router = Router::new().route(
            "/ws",
            get(move |ws: WebSocketUpgrade| {
                let app_for_socket = app_for_route.clone();
                async move { ws.on_upgrade(move |socket| handle_websocket(socket, app_for_socket)) }
            }),
        );

        let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
        println!("WebSocket Sync Server listening on {}", addr);
        if let Ok(listener) = tokio::net::TcpListener::bind(&addr).await {
            let _ = axum::serve(listener, app_router).await;
        }
    });

    let mdns = ServiceDaemon::new().map_err(|e| e.to_string())?;

    // 1. Broadcast ourselves on the local network
    let ip_addrs = local_ip_address::list_afinet_netifas()
        .map_err(|e: local_ip_address::Error| e.to_string())?
        .into_iter()
        .map(|(_, ip)| ip)
        .filter(|ip: &std::net::IpAddr| !ip.is_loopback())
        .collect::<Vec<_>>();

    let mut properties = HashMap::new();
    properties.insert("app".to_string(), "localman".to_string());

    let ip_addr = ip_addrs
        .iter()
        .find(|ip| ip.is_ipv4())
        .copied()
        .or_else(|| ip_addrs.first().copied())
        .ok_or("No valid IP address found on LAN")?;

    let service_info = ServiceInfo::new(
        SERVICE_TYPE,
        &instance_name,
        &format!("{}.local.", instance_name),
        ip_addr.to_string(),
        port,
        Some(properties),
    )
    .map_err(|e| e.to_string())?;

    mdns.register(service_info).map_err(|e| e.to_string())?;
    println!(
        "Broadcasted localman instance '{}' on {}:{}",
        instance_name, ip_addr, port
    );

    // 2. Listen for other peers
    let receiver = mdns.browse(SERVICE_TYPE).map_err(|e| e.to_string())?;
    let known_peers = Arc::new(Mutex::new(HashMap::<String, KnownPeer>::new()));
    let peers_clone = known_peers.clone();
    let local_instance_prefix = format!("{}.", instance_name);

    // Spawn background discovery task
    tokio::spawn(async move {
        while let Ok(event) = receiver.recv_async().await {
            match event {
                ServiceEvent::ServiceResolved(info) => {
                    let name = info.get_fullname().to_string();
                    if name.starts_with(&local_instance_prefix) {
                        continue;
                    }
                    let ip = info
                        .get_addresses()
                        .iter()
                        .find(|ip| ip.is_ipv4())
                        .or_else(|| info.get_addresses().iter().next())
                        .map(|ip| ip.to_string())
                        .unwrap_or_default();
                    if !ip.is_empty() {
                        let mut peers = peers_clone.lock().unwrap();
                        peers.insert(
                            name.clone(),
                            KnownPeer {
                                ip_address: ip.clone(),
                                last_seen_unix: now_unix_secs(),
                            },
                        );
                        println!("Found peer: {} at {}", name, ip);

                        // Emit event to React frontend
                        let _ = app.emit(
                            "peer_found",
                            PeerFoundEvent {
                                instance_name: name,
                                ip_address: ip,
                            },
                        );
                    }
                }
                ServiceEvent::ServiceRemoved(_service_type, fullname) => {
                    let mut peers = peers_clone.lock().unwrap();
                    peers.remove(&fullname);
                    println!("Peer left: {}", fullname);
                }
                _ => {}
            }
        }
    });

    Ok(NetworkState {
        daemon: mdns,
        known_peers,
    })
}

#[tauri::command]
pub fn get_known_peers(state: tauri::State<'_, NetworkState>) -> HashMap<String, String> {
    let mut peers = state.known_peers.lock().unwrap();
    let now = now_unix_secs();
    peers.retain(|_, peer| now.saturating_sub(peer.last_seen_unix) <= STALE_PEER_SECONDS);
    peers
        .iter()
        .map(|(name, peer)| (name.clone(), peer.ip_address.clone()))
        .collect()
}

fn now_unix_secs() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_secs(),
        Err(_) => 0,
    }
}

async fn handle_websocket(mut socket: WebSocket, app: AppHandle) {
    while let Some(msg) = socket.recv().await {
        if let Ok(msg) = msg {
            match msg {
                Message::Text(t) => {
                    let raw = t.to_string();
                    println!("Received WS Text: {}", raw);

                    if let Ok(sync_event) = serde_json::from_str::<SyncEvent>(&raw) {
                        let _ = app.emit("sync_event_received", sync_event.clone());
                        let _ = socket
                            .send(Message::Text(
                                format!("Sync Ack: {}", sync_event.event_id).into(),
                            ))
                            .await;
                    } else {
                        let _ = socket
                            .send(Message::Text("Invalid sync payload".into()))
                            .await;
                    }
                }
                Message::Binary(_) => {}
                Message::Ping(p) => {
                    let _ = socket.send(Message::Pong(p)).await;
                }
                Message::Pong(_) => {}
                Message::Close(_) => break,
            }
        } else {
            break;
        }
    }
}
