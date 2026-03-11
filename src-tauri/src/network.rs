use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri::Emitter;

const SERVICE_TYPE: &str = "_devcollab._tcp.local.";

pub struct NetworkState {
    pub daemon: ServiceDaemon,
    pub known_peers: Arc<Mutex<HashMap<String, String>>>, // instance_name -> ip_address
}

#[derive(serde::Serialize, Clone)]
pub struct PeerFoundEvent {
    pub instance_name: String,
    pub ip_address: String,
}

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
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
        let app_router = Router::new().route(
            "/ws",
            get(|ws: WebSocketUpgrade| async { ws.on_upgrade(|socket| handle_websocket(socket)) }),
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
    properties.insert("app".to_string(), "devcollab".to_string());

    let ip_addr = ip_addrs.first().ok_or("No valid IP address found on LAN")?;

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
        "Broadcasted DevCollab instance '{}' on {}:{}",
        instance_name, ip_addr, port
    );

    // 2. Listen for other peers
    let receiver = mdns.browse(SERVICE_TYPE).map_err(|e| e.to_string())?;
    let known_peers = Arc::new(Mutex::new(HashMap::new()));
    let peers_clone = known_peers.clone();

    // Spawn background discovery task
    tokio::spawn(async move {
        while let Ok(event) = receiver.recv_async().await {
            match event {
                ServiceEvent::ServiceResolved(info) => {
                    let name = info.get_fullname().to_string();
                    let ip = info
                        .get_addresses()
                        .iter()
                        .next()
                        .map(|ip| ip.to_string())
                        .unwrap_or_default();
                    if !ip.is_empty() {
                        let mut peers = peers_clone.lock().unwrap();
                        peers.insert(name.clone(), ip.clone());
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
                ServiceEvent::ServiceRemoved(service_type, fullname) => {
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
    let peers = state.known_peers.lock().unwrap();
    peers.clone()
}

async fn handle_websocket(mut socket: WebSocket) {
    while let Some(msg) = socket.recv().await {
        if let Ok(msg) = msg {
            match msg {
                Message::Text(t) => {
                    println!("Received WS Text: {}", t);
                    // Echo back for now (Week 4 basic implementation)
                    let _ = socket
                        .send(Message::Text(format!("Server Ack: {}", t).into()))
                        .await;
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
