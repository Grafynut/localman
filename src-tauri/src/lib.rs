mod db;
mod http;
mod network;
mod sync;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Provide a Tokio runtime for the background tasks (Axum WebSocket server)
#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 1. Initialize DB and create tables
            let conn = db::init_db(app.handle()).expect("Failed to initialize database");

            // 2. Set up db connection for Tauri state
            app.manage(db::AppState {
                db: std::sync::Mutex::new(Some(conn)),
            });

            // Start mDNS network discovery
            let app_handle = app.handle().clone();
            let network_state = network::start_mdns(app_handle, "devcollab_host".to_string(), 8080)
                .expect("Failed to start mDNS daemon");
            app.manage(network_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            db::health_check,
            db::create_collection,
            db::get_collections,
            db::create_request,
            db::get_requests_by_collection,
            http::execute_request,
            network::get_known_peers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
