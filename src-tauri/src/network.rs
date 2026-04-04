use crate::sync::SyncEvent;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tauri::Emitter;

const SERVICE_TYPE: &str = "_localman._tcp.local.";
const STALE_PEER_SECONDS: u64 = 35;

#[derive(Clone)]
pub struct KnownPeer {
    pub ip_address: String,
    pub last_seen_unix: u64,
}

#[derive(serde::Serialize, Clone)]
pub struct LocalIdentity {
    pub instance_name: String,
    pub ip_address: String,
}

pub struct NetworkState {
    pub daemon: ServiceDaemon,
    pub known_peers: Arc<Mutex<HashMap<String, KnownPeer>>>, // instance_name -> peer data
    pub local_identity: LocalIdentity,
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
use uuid::Uuid;

pub fn start_mdns(
    app: AppHandle,
    mut instance_name: String,
    port: u16,
) -> Result<NetworkState, String> {
    // Add short random suffix for collision avoidance
    let suffix = &Uuid::new_v4().to_string()[..4];
    instance_name = format!("{}-{}", instance_name, suffix);

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

    // 1. Get all network interfaces with their names and IPs
    let all_interfaces = local_ip_address::list_afinet_netifas()
        .map_err(|e: local_ip_address::Error| e.to_string())?;
    
    println!("--- Network Debug: Detected Interfaces ---");
    for (name, ip) in &all_interfaces {
        println!("  Interface: '{}' | IP: {}", name, ip);
    }
    println!("------------------------------------------");

    // 2. Filter out clearly virtual/internal interfaces
    let physical_interfaces = all_interfaces
        .into_iter()
        .filter(|(name, ip)| {
            let n = name.to_lowercase();
            !ip.is_loopback() && 
            !n.contains("wsl") && 
            !n.contains("vethernet") && 
            !n.contains("virtual") && 
            !n.contains("vmware") && 
            !n.contains("docker") &&
            !n.contains("pseudo")
        })
        .collect::<Vec<_>>();

    // 3. Selection Strategy: Force IPv4 for stability (Global IPv6 is often blocked)
    let ip_addr = physical_interfaces.iter()
        .find(|(name, ip)| {
            let n = name.to_lowercase();
            // Primary: WiFi or common Linux physical names (enp, eth, ens)
            ip.is_ipv4() && (
                n.contains("wi-fi") || n.contains("wifi") || n.contains("wlan") || 
                n.starts_with("enp") || n.starts_with("eth") || n.starts_with("ens")
            )
        })
        .map(|(_, ip)| *ip)
        .or_else(|| {
            // Priority LAN IPv4 ranges
            physical_interfaces.iter().find(|(_, ip)| match ip {
                std::net::IpAddr::V4(v4) => {
                    let octets = v4.octets();
                    (octets[0] == 192 && octets[1] == 168) || // 192.168.x.x
                    (octets[0] == 10) ||                      // 10.x.x.x
                    (octets[0] == 172 && (16..=31).contains(&octets[1])) // 172.16-31.x.x
                }
                _ => false,
            }).map(|(_, ip)| *ip)
        })
        .or_else(|| {
            // Any physical IPv4
            physical_interfaces.iter().find(|(_, ip)| ip.is_ipv4()).map(|(_, ip)| *ip)
        })
        .ok_or("No valid physical IPv4 address found. IPv6 is currently disabled for local syncing to ensure firewall compatibility. Please ensure your WiFi is active and has an IPv4 address.")?;

    // Diagnostic: Check for NAT mode which breaks mDNS discovery
    if let std::net::IpAddr::V4(v4) = ip_addr {
        let octets = v4.octets();
        if octets[0] == 10 && octets[1] == 0 && octets[2] == 2 {
            println!("*************************************************");
            println!("*   WARNING: NAT MODE DETECTED (10.0.2.x)       *");
            println!("* Localman discovery will likely fail in NAT.   *");
            println!("* Switch VM to 'Bridged Mode' to fix this.      *");
            println!("*************************************************");
        }
    }

    let mut properties = HashMap::new();
    properties.insert("app".to_string(), "localman".to_string());

    let service_info = ServiceInfo::new(
        SERVICE_TYPE,
        &instance_name,
        &format!("{}.local.", instance_name),
        ip_addr.to_string(),
        port,
        Some(properties.clone()),
    )
    .map_err(|e| e.to_string())?;

    mdns.register(service_info.clone()).map_err(|e| e.to_string())?;
    
    // Heartbeat Task: Periodically re-register to stay visible when minimized/backgrounded
    let mdns_heartbeat = mdns.clone();
    let service_info_heartbeat = service_info.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            let _ = mdns_heartbeat.register(service_info_heartbeat.clone());
        }
    });

    println!(
        "Broadcasted localman instance '{}' on {}:{} (IPv4 Only)",
        instance_name, ip_addr, port
    );

    // 2. Listen for other peers
    let receiver = mdns.browse(SERVICE_TYPE).map_err(|e| e.to_string())?;
    let known_peers = Arc::new(Mutex::new(HashMap::<String, KnownPeer>::new()));
    let peers_clone = known_peers.clone();
    let local_instance_prefix = format!("{}.", instance_name);

    // Spawn background discovery task
    let app_browse = app.clone();
    let peers_browse = peers_clone.clone();
    tokio::spawn(async move {
        while let Ok(event) = receiver.recv_async().await {
            match event {
                ServiceEvent::ServiceResolved(info) => {
                    let name = info.get_fullname().to_string();
                    if name.starts_with(&local_instance_prefix) {
                        continue;
                    }
                    // STRICTLY ONLY IPv4 for peers to avoid connection timeouts
                    let ip = info
                        .get_addresses()
                        .iter()
                        .find(|ip| ip.is_ipv4())
                        .map(|ip| ip.to_string())
                        .unwrap_or_default();

                    if !ip.is_empty() {
                        let mut peers = peers_browse.lock().unwrap();
                        peers.insert(
                            name.clone(),
                            KnownPeer {
                                ip_address: ip.clone(),
                                last_seen_unix: now_unix_secs(),
                            },
                        );
                        println!("Found peer: {} at {} (IPv4)", name, ip);

                        // Broadcast updated list to frontend
                        let current_peers: HashMap<String, String> = peers
                            .iter()
                            .map(|(n, p)| (n.clone(), p.ip_address.clone()))
                            .collect();
                        let _ = app_browse.emit("peers_updated", current_peers);
                    }
                }
                ServiceEvent::ServiceRemoved(_service_type, fullname) => {
                    let mut peers = peers_browse.lock().unwrap();
                    peers.remove(&fullname);
                    println!("Peer left: {}", fullname);
                    
                    // Broadcast updated list to frontend
                    let current_peers: HashMap<String, String> = peers
                        .iter()
                        .map(|(n, p)| (n.clone(), p.ip_address.clone()))
                        .collect();
                    let _ = app_browse.emit("peers_updated", current_peers);
                }
                _ => {}
            }
        }
    });

    // Background Stale Checker: Ensure devices disappear accurately if they stop heartbeating
    let app_stale = app.clone();
    let peers_stale = known_peers.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            let mut peers = peers_stale.lock().unwrap();
            let now = now_unix_secs();
            let initial_count = peers.len();
            peers.retain(|_, peer| now.saturating_sub(peer.last_seen_unix) <= STALE_PEER_SECONDS);
            
            if peers.len() != initial_count {
                println!("Purged {} stale peers", initial_count - peers.len());
                let current_peers: HashMap<String, String> = peers
                    .iter()
                    .map(|(n, p)| (n.clone(), p.ip_address.clone()))
                    .collect();
                let _ = app_stale.emit("peers_updated", current_peers);
            }
        }
    });

    Ok(NetworkState {
        daemon: mdns,
        known_peers,
        local_identity: LocalIdentity {
            instance_name,
            ip_address: ip_addr.to_string(),
        },
    })
}

#[tauri::command]
pub fn get_local_identity(state: tauri::State<'_, NetworkState>) -> LocalIdentity {
    state.local_identity.clone()
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

#[tauri::command]
pub fn add_manual_peer(
    app: tauri::AppHandle,
    state: tauri::State<'_, NetworkState>,
    ip: String,
) -> Result<(), String> {
    let mut peers = state.known_peers.lock().unwrap();
    let name = format!("Manual-{}", ip.replace('.', "-"));
    peers.insert(
        name.clone(),
        KnownPeer {
            ip_address: ip.clone(),
            last_seen_unix: now_unix_secs() + 3600 * 24, // Keep for 24 hours as priority
        },
    );

    // Broadcast updated list to frontend
    let current_peers: std::collections::HashMap<String, String> = peers
        .iter()
        .map(|(n, p)| (n.clone(), p.ip_address.clone()))
        .collect();
    let _ = app.emit("peers_updated", current_peers);

    println!("Manually added peer: {} at {}", name, ip);
    Ok(())
}

#[tauri::command]
pub fn remove_peer(
    app: tauri::AppHandle,
    state: tauri::State<'_, NetworkState>,
    name: String,
) -> Result<(), String> {
    let mut peers = state.known_peers.lock().unwrap();
    peers.remove(&name);

    // Broadcast updated list to frontend
    let current_peers: std::collections::HashMap<String, String> = peers
        .iter()
        .map(|(n, p)| (n.clone(), p.ip_address.clone()))
        .collect();
    let _ = app.emit("peers_updated", current_peers);

    println!("Manually removed peer: {}", name);
    Ok(())
}

fn now_unix_secs() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_secs(),
        Err(_) => 0,
    }
}

use futures::SinkExt;
use tokio_tungstenite::connect_async;

#[tauri::command]
pub async fn send_sync_event(peer_ip: String, event: SyncEvent) -> Result<(), String> {
    let raw_ip = peer_ip.trim().replace('[', "").replace(']', "");
    let host = if raw_ip.contains(':') {
        format!("[{}]", raw_ip)
    } else {
        raw_ip
    };
    
    let url = format!("ws://{}:8080/ws", host);
    println!("Rust: Connecting to {} to send sync event", url);
    
    let (mut ws_stream, _) = connect_async(url).await.map_err(|e| format!("Failed to connect to {}: {}", host, e))?;
    
    let payload = serde_json::to_string(&event).map_err(|e| format!("Serialization error: {}", e))?;
    ws_stream.send(tokio_tungstenite::tungstenite::Message::Text(payload.into()))
        .await
        .map_err(|e: tokio_tungstenite::tungstenite::Error| format!("Failed to send payload to {}: {}", host, e))?;
    
    let _ = ws_stream.close(None).await;
    Ok(())
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
