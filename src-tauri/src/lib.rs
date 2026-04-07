mod db;
pub mod http;
mod network;
mod sync;
mod ws_client;
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
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // 1. Initialize DB and create tables
            let conn = db::init_db(app.handle()).expect("Failed to initialize database");

            app.manage(db::AppState {
                db: std::sync::Mutex::new(Some(conn)),
            });
            app.manage(ws_client::WsState::new());

            // Start mDNS network discovery
            let app_handle = app.handle().clone();
            let hostname = hostname::get()
                .ok()
                .and_then(|h| h.into_string().ok())
                .unwrap_or_else(|| "localman_host".to_string());
            let instance_name = format!("localman_{}", hostname);
            
            println!("Starting mDNS with instance name: {}", instance_name);
            let network_state = network::start_mdns(app_handle, instance_name, 8080)
                .expect("Failed to start mDNS daemon");
            app.manage(network_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            db::health_check,
            db::get_workspaces,
            db::create_workspace,
            db::create_folder,
            db::rename_folder,
            db::upsert_folder,
            db::delete_folder,
            db::duplicate_folder,
            db::get_folders,
            db::update_folder_location,
            db::update_request_location,
            db::update_collection_location,
            db::create_collection,
            db::get_collections,
            db::upsert_collection,
            db::rename_collection,
            db::delete_collection,
            db::duplicate_collection,
            db::create_request,
            db::update_request,
            db::upsert_request,
            db::rename_request,
            db::delete_request,
            db::duplicate_request,
            db::get_requests_by_collection,
            db::get_environments,
            db::create_environment,
            db::update_environment,
            db::delete_environment,
            db::set_active_environment,
            db::save_history_entry,
            db::get_history,
            db::clear_history,
            db::get_globals,
            db::update_globals,
            ws_client::ws_connect,
            ws_client::ws_send,
            ws_client::ws_disconnect,
            http::execute_request,
            network::get_known_peers,
            network::get_local_identity,
            network::send_sync_event,
            network::add_manual_peer,
            network::remove_peer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
