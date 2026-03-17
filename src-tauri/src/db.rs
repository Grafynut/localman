use rusqlite::Connection;
use std::fs;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Option<Connection>>,
}

pub fn init_db(
    app_handle: &tauri::AppHandle,
) -> std::result::Result<Connection, Box<dyn std::error::Error>> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }
    let db_path = app_dir.join("devcollab.db");
    println!("Initializing database at: {:?}", db_path);
    let conn = Connection::open(db_path)?;

    // Initialize required SQLite tables
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO users (id, name, email) VALUES ('local_user_1', 'Local Dev', 'local@devcollab.localhost');

        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        );
        INSERT OR IGNORE INTO workspaces (id, name, owner_id) VALUES ('default_workspace', 'My Workspace', 'local_user_1');

        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL DEFAULT 'default_workspace',
            name TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
            FOREIGN KEY(owner_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            collection_id TEXT NOT NULL,
            name TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(collection_id) REFERENCES collections(id)
        );

        CREATE TABLE IF NOT EXISTS requests (
            id TEXT PRIMARY KEY,
            collection_id TEXT NOT NULL,
            folder_id TEXT,
            name TEXT NOT NULL,
            method TEXT NOT NULL,
            url TEXT NOT NULL,
            headers TEXT,
            body TEXT,
            position INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            pre_request_script TEXT,
            post_request_script TEXT,
            body_type TEXT DEFAULT 'raw',
            form_data TEXT,
            binary_file_path TEXT,
            FOREIGN KEY(collection_id) REFERENCES collections(id),
            FOREIGN KEY(folder_id) REFERENCES folders(id)
        );
        CREATE TABLE IF NOT EXISTS collection_members (
            user_id TEXT NOT NULL,
            collection_id TEXT NOT NULL,
            role TEXT NOT NULL,
            PRIMARY KEY (user_id, collection_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(collection_id) REFERENCES collections(id)
        );
        CREATE TABLE IF NOT EXISTS environments (
            id TEXT PRIMARY KEY,
            workspace_id TEXT,
            collection_id TEXT,
            name TEXT NOT NULL,
            variables TEXT NOT NULL,
            is_active INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
            FOREIGN KEY(collection_id) REFERENCES collections(id)
        );
        CREATE TABLE IF NOT EXISTS globals (
            id TEXT PRIMARY KEY,
            variables TEXT NOT NULL
        );
        INSERT OR IGNORE INTO globals (id, variables) VALUES ('global_settings_1', '{}');
        "
    )?;

    // Migrations: Add missing columns if they don't exist
    // workspace_id for collections
    let _ = conn.execute(
        "ALTER TABLE collections ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default_workspace'",
        [],
    );
    // folder_id and position for requests
    let _ = conn.execute("ALTER TABLE requests ADD COLUMN folder_id TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE requests ADD COLUMN position INTEGER DEFAULT 0",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE requests ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE requests ADD COLUMN pre_request_script TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE requests ADD COLUMN post_request_script TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE requests ADD COLUMN body_type TEXT DEFAULT 'raw'",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE requests ADD COLUMN form_data TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE requests ADD COLUMN binary_file_path TEXT",
        [],
    );
    let _ = conn.execute(
        "CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        collection_id TEXT,
        name TEXT NOT NULL,
        variables TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
        FOREIGN KEY(collection_id) REFERENCES collections(id)
    )",
        [],
    );

    let _ = conn.execute(
        "CREATE TABLE IF NOT EXISTS globals (
        id TEXT PRIMARY KEY,
        variables TEXT NOT NULL
    )",
        [],
    );
    let _ = conn.execute(
        "INSERT OR IGNORE INTO globals (id, variables) VALUES ('global_settings_1', '{}')",
        [],
    );

    
    let _ = conn.execute(
        "CREATE TABLE IF NOT EXISTS request_history (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        request_id TEXT,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        request_headers TEXT,
        request_body TEXT,
        status_code INTEGER,
        response_body TEXT,
        response_headers TEXT,
        time_ms INTEGER,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
        [],
    );

    // Migration for request_history columns (ignores errors if they already exist, but logs them)
    if let Err(e) = conn.execute("ALTER TABLE request_history ADD COLUMN test_results TEXT", []) {
        println!("Migration notice (test_results): {}", e);
    }
    if let Err(e) = conn.execute("ALTER TABLE request_history ADD COLUMN body_type TEXT", []) {
        println!("Migration notice (body_type): {}", e);
    }
    if let Err(e) = conn.execute("ALTER TABLE request_history ADD COLUMN form_data TEXT", []) {
        println!("Migration notice (form_data): {}", e);
    }
    if let Err(e) = conn.execute("ALTER TABLE request_history ADD COLUMN binary_file_path TEXT", []) {
        println!("Migration notice (binary_file_path): {}", e);
    }

    println!("Database initialized successfully");

    Ok(conn)
}

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub owner_id: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Folder {
    pub id: String,
    pub collection_id: String,
    pub name: String,
    pub position: i32,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Collection {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub owner_id: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StoredRequest {
    pub id: String,
    pub collection_id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Option<String>,
    pub body: Option<String>,
    pub position: i32,
    pub pre_request_script: Option<String>,
    pub post_request_script: Option<String>,
    pub body_type: Option<String>,
    pub form_data: Option<String>,
    pub binary_file_path: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Environment {
    pub id: String,
    pub workspace_id: Option<String>,
    pub collection_id: Option<String>,
    pub name: String,
    pub variables: String,
    pub is_active: bool,
    pub created_at: String,
}

fn fetch_collection_by_id(conn: &Connection, id: &str) -> std::result::Result<Collection, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, name, owner_id, created_at FROM collections WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Collection {
            id: row.get(0).unwrap_or_default(),
            workspace_id: row.get(1).unwrap_or_default(),
            name: row.get(2).unwrap_or_default(),
            owner_id: row.get(3).unwrap_or_default(),
            created_at: row.get(4).unwrap_or_default(),
        })
    } else {
        Err("Collection not found".to_string())
    }
}

fn fetch_request_by_id(conn: &Connection, id: &str) -> std::result::Result<StoredRequest, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, collection_id, folder_id, name, method, url, headers, body, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path
             FROM requests
             WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(StoredRequest {
            id: row.get(0).unwrap_or_default(),
            collection_id: row.get(1).unwrap_or_default(),
            folder_id: row.get::<_, Option<String>>(2).unwrap_or_default(),
            name: row.get(3).unwrap_or_default(),
            method: row.get(4).unwrap_or_default(),
            url: row.get(5).unwrap_or_default(),
            headers: row.get(6).ok(),
            body: row.get(7).ok(),
            position: row.get(8).unwrap_or_default(),
            pre_request_script: row.get(9).ok(),
            post_request_script: row.get(10).ok(),
            body_type: row.get(11).ok(),
            form_data: row.get(12).ok(),
            binary_file_path: row.get(13).ok(),
        })
    } else {
        Err("Request not found".to_string())
    }
}

fn fetch_folder_by_id(conn: &Connection, id: &str) -> std::result::Result<Folder, String> {
    let mut stmt = conn
        .prepare("SELECT id, collection_id, name, position, created_at FROM folders WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Folder {
            id: row.get(0).unwrap_or_default(),
            collection_id: row.get(1).unwrap_or_default(),
            name: row.get(2).unwrap_or_default(),
            position: row.get(3).unwrap_or_default(),
            created_at: row.get(4).unwrap_or_default(),
        })
    } else {
        Err("Folder not found".to_string())
    }
}

#[tauri::command]
pub fn create_collection(
    state: tauri::State<'_, AppState>,
    id: String,
    workspace_id: String,
    name: String,
    owner_id: String,
) -> std::result::Result<Collection, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO collections (id, workspace_id, name, owner_id) VALUES (?1, ?2, ?3, ?4)",
            (&id, &workspace_id, &name, &owner_id),
        )
        .map_err(|e| e.to_string())?;

        fetch_collection_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn get_collections(
    state: tauri::State<'_, AppState>,
    workspace_id: String,
) -> std::result::Result<Vec<Collection>, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let mut stmt = conn
            .prepare("SELECT id, workspace_id, name, owner_id, created_at FROM collections WHERE workspace_id = ?1")
            .map_err(|e| e.to_string())?;
        let collection_iter = stmt
            .query_map([&workspace_id], |row| {
                Ok(Collection {
                    id: row.get(0).unwrap_or_default(),
                    workspace_id: row.get(1).unwrap_or_default(),
                    name: row.get(2).unwrap_or_default(),
                    owner_id: row.get(3).unwrap_or_default(),
                    created_at: row.get(4).unwrap_or_default(),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut collections = Vec::new();
        for collection_result in collection_iter {
            if let Ok(c) = collection_result {
                collections.push(c);
            }
        }
        Ok(collections)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn upsert_collection(
    state: tauri::State<'_, AppState>,
    id: String,
    workspace_id: String,
    name: String,
    owner_id: String,
) -> std::result::Result<Collection, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO collections (id, workspace_id, name, owner_id)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET
               workspace_id = excluded.workspace_id,
               name = excluded.name,
               owner_id = excluded.owner_id",
            (&id, &workspace_id, &name, &owner_id),
        )
        .map_err(|e| e.to_string())?;

        fetch_collection_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn rename_collection(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
) -> std::result::Result<Collection, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let affected = conn
            .execute(
                "UPDATE collections SET name = ?2 WHERE id = ?1",
                (&id, &name),
            )
            .map_err(|e| e.to_string())?;
        if affected == 0 {
            return Err("Collection not found".to_string());
        }
        fetch_collection_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn delete_collection(
    state: tauri::State<'_, AppState>,
    id: String,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute("DELETE FROM requests WHERE collection_id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        let affected = conn
            .execute("DELETE FROM collections WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        if affected == 0 {
            return Err("Collection not found".to_string());
        }
        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn duplicate_collection(
    state: tauri::State<'_, AppState>,
    source_id: String,
    new_id: String,
    new_name: String,
) -> std::result::Result<Collection, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let source = fetch_collection_by_id(conn, &source_id)?;
        conn.execute(
            "INSERT INTO collections (id, workspace_id, name, owner_id) VALUES (?1, ?2, ?3, ?4)",
            (&new_id, &source.workspace_id, &new_name, &source.owner_id),
        )
        .map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT name, method, url, headers, body, folder_id, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path
                 FROM requests
                 WHERE collection_id = ?1",
            )
            .map_err(|e| e.to_string())?;
        let req_iter = stmt
            .query_map([&source_id], |row| {
                Ok((
                    row.get::<_, String>(0).unwrap_or_default(),
                    row.get::<_, String>(1).unwrap_or_default(),
                    row.get::<_, String>(2).unwrap_or_default(),
                    row.get::<_, Option<String>>(3).ok().flatten(),
                    row.get::<_, Option<String>>(4).ok().flatten(),
                    row.get::<_, Option<String>>(5).ok().flatten(),
                    row.get::<_, Option<String>>(6).unwrap_or_default(),
                    row.get::<_, Option<String>>(7).ok().flatten(),
                    row.get::<_, Option<String>>(8).ok().flatten(),
                    row.get::<_, Option<String>>(9).ok().flatten(),
                    row.get::<_, Option<String>>(10).ok().flatten(),
                    row.get::<_, Option<String>>(11).ok().flatten(),
                ))
            })
            .map_err(|e| e.to_string())?;

        for req in req_iter {
            if let Ok((name, method, url, headers, body, folder_id, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path)) = req {
                let cloned_id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO requests (id, collection_id, name, method, url, headers, body, folder_id, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                    (&cloned_id, &new_id, &name, &method, &url, &headers, &body, &folder_id, &position, &pre_request_script, &post_request_script, &body_type, &form_data, &binary_file_path),
                )
                .map_err(|e| e.to_string())?;
            }
        }

        fetch_collection_by_id(conn, &new_id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn create_request(
    state: tauri::State<'_, AppState>,
    id: String,
    collection_id: String,
    folder_id: Option<String>,
    name: String,
    method: String,
    url: String,
    headers: Option<String>,
    body: Option<String>,
    position: i32,
    pre_request_script: Option<String>,
    post_request_script: Option<String>,
    body_type: Option<String>,
    form_data: Option<String>,
    binary_file_path: Option<String>,
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, body, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            (&id, &collection_id, &folder_id, &name, &method, &url, &headers, &body, &position, &pre_request_script, &post_request_script, &body_type, &form_data, &binary_file_path),
        ).map_err(|e| e.to_string())?;

        fetch_request_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn get_workspaces(
    state: tauri::State<'_, AppState>,
    owner_id: String,
) -> std::result::Result<Vec<Workspace>, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let mut stmt = conn
            .prepare("SELECT id, name, owner_id, created_at FROM workspaces WHERE owner_id = ?1")
            .map_err(|e| e.to_string())?;
        let workspace_iter = stmt
            .query_map([&owner_id], |row| {
                Ok(Workspace {
                    id: row.get(0).unwrap_or_default(),
                    name: row.get(1).unwrap_or_default(),
                    owner_id: row.get(2).unwrap_or_default(),
                    created_at: row.get(3).unwrap_or_default(),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut workspaces = Vec::new();
        for workspace_result in workspace_iter {
            if let Ok(w) = workspace_result {
                workspaces.push(w);
            }
        }
        Ok(workspaces)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn create_workspace(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    owner_id: String,
) -> std::result::Result<Workspace, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO workspaces (id, name, owner_id) VALUES (?1, ?2, ?3)",
            (&id, &name, &owner_id),
        )
        .map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT id, name, owner_id, created_at FROM workspaces WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Workspace {
                id: row.get(0).unwrap_or_default(),
                name: row.get(1).unwrap_or_default(),
                owner_id: row.get(2).unwrap_or_default(),
                created_at: row.get(3).unwrap_or_default(),
            })
        } else {
            Err("Workspace created but could not be fetched".to_string())
        }
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn get_folders(
    state: tauri::State<'_, AppState>,
    collection_id: String,
) -> std::result::Result<Vec<Folder>, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let mut stmt = conn
            .prepare("SELECT id, collection_id, name, position, created_at FROM folders WHERE collection_id = ?1 ORDER BY position ASC")
            .map_err(|e| e.to_string())?;
        let folder_iter = stmt
            .query_map([&collection_id], |row| {
                Ok(Folder {
                    id: row.get(0).unwrap_or_default(),
                    collection_id: row.get(1).unwrap_or_default(),
                    name: row.get(2).unwrap_or_default(),
                    position: row.get(3).unwrap_or_default(),
                    created_at: row.get(4).unwrap_or_default(),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut folders = Vec::new();
        for folder_result in folder_iter {
            if let Ok(f) = folder_result {
                folders.push(f);
            }
        }
        Ok(folders)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn update_folder_location(
    state: tauri::State<'_, AppState>,
    id: String,
    collection_id: String,
    position: i32,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        // 1. Fetch all folders in the target collection, excluding the one we're moving if it's already there
        let mut stmt = conn
            .prepare("SELECT id FROM folders WHERE collection_id = ?1 AND id != ?2 ORDER BY position ASC, created_at ASC")
            .map_err(|e| e.to_string())?;

        let mut folder_ids: Vec<String> = stmt
            .query_map([&collection_id, &id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // 2. Insert the moved folder at the desired index
        let target_idx = (position as usize).min(folder_ids.len());
        folder_ids.insert(target_idx, id.clone());

        // 3. Update all folders with new sequential positions
        for (idx, folder_id) in folder_ids.iter().enumerate() {
            conn.execute(
                "UPDATE folders SET collection_id = ?1, position = ?2 WHERE id = ?3",
                (&collection_id, idx as i32, folder_id),
            )
            .map_err(|e| e.to_string())?;
        }

        // 4. Special case: if it was moved from a different collection, we should re-normalize that one too
        // (Optional but good for cleanliness)

        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn create_folder(
    state: tauri::State<'_, AppState>,
    id: String,
    collection_id: String,
    name: String,
    position: i32,
) -> std::result::Result<Folder, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO folders (id, collection_id, name, position) VALUES (?1, ?2, ?3, ?4)",
            (&id, &collection_id, &name, &position),
        )
        .map_err(|e| e.to_string())?;

        fetch_folder_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn rename_folder(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
) -> std::result::Result<Folder, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute("UPDATE folders SET name = ?2 WHERE id = ?1", (&id, &name))
            .map_err(|e| e.to_string())?;
        fetch_folder_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn delete_folder(
    state: tauri::State<'_, AppState>,
    id: String,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute("DELETE FROM requests WHERE folder_id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM folders WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn duplicate_folder(
    state: tauri::State<'_, AppState>,
    source_id: String,
    new_id: String,
    new_name: String,
) -> std::result::Result<Folder, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let source = fetch_folder_by_id(conn, &source_id)?;
        conn.execute(
            "INSERT INTO folders (id, collection_id, name, position) VALUES (?1, ?2, ?3, ?4)",
            (&new_id, &source.collection_id, &new_name, &source.position),
        ).map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT name, method, url, headers, body, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path FROM requests WHERE folder_id = ?1")
            .map_err(|e| e.to_string())?;
        
        let req_iter = stmt.query_map([&source_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i32>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<String>>(9)?,
                row.get::<_, Option<String>>(10)?,
            ))
        }).map_err(|e| e.to_string())?;

        for req in req_iter {
            if let Ok((name, method, url, headers, body, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path)) = req {
                let cloned_req_id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, body, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                    (&cloned_req_id, &source.collection_id, Some(&new_id), &name, &method, &url, &headers, &body, &position, &pre_request_script, &post_request_script, &body_type, &form_data, &binary_file_path),
                ).map_err(|e| e.to_string())?;
            }
        }

        fetch_folder_by_id(conn, &new_id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn update_request_location(
    state: tauri::State<'_, AppState>,
    id: String,
    collection_id: String,
    folder_id: Option<String>,
    position: i32,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        // 1. Fetch all requests in the target container, excluding the one we're moving
        let mut stmt = conn
            .prepare("SELECT id FROM requests WHERE collection_id = ?1 AND (folder_id IS ?2) AND id != ?3 ORDER BY position ASC, id ASC")
            .map_err(|e| e.to_string())?;

        let mut request_ids: Vec<String> = stmt
            .query_map((&collection_id, &folder_id, &id), |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // 2. Insert the moved request at the desired index
        let target_idx = (position as usize).min(request_ids.len());
        request_ids.insert(target_idx, id.clone());

        // 3. Update all requests with new sequential positions
        for (idx, req_id) in request_ids.iter().enumerate() {
            conn.execute(
                "UPDATE requests SET collection_id = ?1, folder_id = ?2, position = ?3 WHERE id = ?4",
                (&collection_id, &folder_id, idx as i32, req_id),
            ).map_err(|e| e.to_string())?;
        }

        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn update_request(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    method: String,
    url: String,
    headers: Option<String>,
    body: Option<String>,
    pre_request_script: Option<String>,
    post_request_script: Option<String>,
    body_type: Option<String>,
    form_data: Option<String>,
    binary_file_path: Option<String>,
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let affected = conn
            .execute(
                "UPDATE requests
                 SET name = ?2, method = ?3, url = ?4, headers = ?5, body = ?6, pre_request_script = ?7, post_request_script = ?8, body_type = ?9, form_data = ?10, binary_file_path = ?11
                 WHERE id = ?1",
                (&id, &name, &method, &url, &headers, &body, &pre_request_script, &post_request_script, &body_type, &form_data, &binary_file_path),
            )
            .map_err(|e| e.to_string())?;

        if affected == 0 {
            return Err("Request not found".to_string());
        }

        fetch_request_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn upsert_request(
    state: tauri::State<'_, AppState>,
    id: String,
    collection_id: String,
    folder_id: Option<String>,
    name: String,
    method: String,
    url: String,
    headers: Option<String>,
    body: Option<String>,
    position: i32,
    pre_request_script: Option<String>,
    post_request_script: Option<String>,
    body_type: Option<String>,
    form_data: Option<String>,
    binary_file_path: Option<String>,
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, body, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(id) DO UPDATE SET
               collection_id = excluded.collection_id,
               folder_id = excluded.folder_id,
               name = excluded.name,
               method = excluded.method,
               url = excluded.url,
               headers = excluded.headers,
               body = excluded.body,
               position = excluded.position,
               pre_request_script = excluded.pre_request_script,
               post_request_script = excluded.post_request_script,
               body_type = excluded.body_type,
               form_data = excluded.form_data,
               binary_file_path = excluded.binary_file_path",
            (&id, &collection_id, &folder_id, &name, &method, &url, &headers, &body, &position, &pre_request_script, &post_request_script, &body_type, &form_data, &binary_file_path),
        )
        .map_err(|e| e.to_string())?;

        fetch_request_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn rename_request(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let affected = conn
            .execute("UPDATE requests SET name = ?2 WHERE id = ?1", (&id, &name))
            .map_err(|e| e.to_string())?;
        if affected == 0 {
            return Err("Request not found".to_string());
        }
        fetch_request_by_id(conn, &id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn delete_request(
    state: tauri::State<'_, AppState>,
    id: String,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let affected = conn
            .execute("DELETE FROM requests WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        if affected == 0 {
            return Err("Request not found".to_string());
        }
        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn duplicate_request(
    state: tauri::State<'_, AppState>,
    source_id: String,
    new_id: String,
    new_name: String,
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let source = fetch_request_by_id(conn, &source_id)?;
        conn.execute(
            "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, body, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            (
                &new_id,
                &source.collection_id,
                &source.folder_id,
                &new_name,
                &source.method,
                &source.url,
                &source.headers,
                &source.body,
                &source.position,
                &source.pre_request_script,
                &source.post_request_script,
                &source.body_type,
                &source.form_data,
                &source.binary_file_path,
            ),
        )
        .map_err(|e| e.to_string())?;

        fetch_request_by_id(conn, &new_id)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn get_requests_by_collection(
    state: tauri::State<'_, AppState>,
    collection_id: String,
) -> std::result::Result<Vec<StoredRequest>, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let mut stmt = conn
            .prepare(
                "SELECT id, collection_id, folder_id, name, method, url, headers, body, position, pre_request_script, post_request_script, body_type, form_data, binary_file_path
                 FROM requests
                 WHERE collection_id = ?1
                 ORDER BY position ASC",
            )
            .map_err(|e| e.to_string())?;

        let request_iter = stmt
            .query_map([&collection_id], |row| {
                Ok(StoredRequest {
                    id: row.get(0).unwrap_or_default(),
                    collection_id: row.get(1).unwrap_or_default(),
                    folder_id: row.get::<_, Option<String>>(2).unwrap_or_default(),
                    name: row.get(3).unwrap_or_default(),
                    method: row.get(4).unwrap_or_default(),
                    url: row.get(5).unwrap_or_default(),
                    headers: row.get(6).ok(),
                    body: row.get(7).ok(),
                    position: row.get(8).unwrap_or_default(),
                    pre_request_script: row.get(9).ok(),
                    post_request_script: row.get(10).ok(),
                    body_type: row.get(11).ok(),
                    form_data: row.get(12).ok(),
                    binary_file_path: row.get(13).ok(),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut requests = Vec::new();
        for request_result in request_iter {
            if let Ok(request) = request_result {
                requests.push(request);
            }
        }
        Ok(requests)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn health_check() -> String {
    "DevCollab Core Engine is running!".to_string()
}

#[tauri::command]
pub fn get_environments(
    state: tauri::State<'_, AppState>,
    workspace_id: String,
) -> std::result::Result<Vec<Environment>, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let mut stmt = conn
            .prepare("SELECT id, workspace_id, collection_id, name, variables, is_active, created_at FROM environments WHERE workspace_id = ?1 OR workspace_id IS NULL")
            .map_err(|e| e.to_string())?;
        let env_iter = stmt
            .query_map([&workspace_id], |row| {
                Ok(Environment {
                    id: row.get(0).unwrap_or_default(),
                    workspace_id: row.get(1).ok(),
                    collection_id: row.get(2).ok(),
                    name: row.get(3).unwrap_or_default(),
                    variables: row.get(4).unwrap_or_default(),
                    is_active: row.get::<_, i32>(5).unwrap_or(0) == 1,
                    created_at: row.get(6).unwrap_or_default(),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut environments = Vec::new();
        for env_result in env_iter {
            if let Ok(e) = env_result {
                environments.push(e);
            }
        }
        Ok(environments)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn create_environment(
    state: tauri::State<'_, AppState>,
    id: String,
    workspace_id: Option<String>,
    collection_id: Option<String>,
    name: String,
    variables: String,
) -> std::result::Result<Environment, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO environments (id, workspace_id, collection_id, name, variables) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&id, &workspace_id, &collection_id, &name, &variables),
        )
        .map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT id, workspace_id, collection_id, name, variables, is_active, created_at FROM environments WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Environment {
                id: row.get(0).unwrap_or_default(),
                workspace_id: row.get(1).ok(),
                collection_id: row.get(2).ok(),
                name: row.get(3).unwrap_or_default(),
                variables: row.get(4).unwrap_or_default(),
                is_active: row.get::<_, i32>(5).unwrap_or(0) == 1,
                created_at: row.get(6).unwrap_or_default(),
            })
        } else {
            Err("Environment created but could not be fetched".to_string())
        }
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn update_environment(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    variables: String,
) -> std::result::Result<Environment, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "UPDATE environments SET name = ?2, variables = ?3 WHERE id = ?1",
            (&id, &name, &variables),
        )
        .map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT id, workspace_id, collection_id, name, variables, is_active, created_at FROM environments WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Environment {
                id: row.get(0).unwrap_or_default(),
                workspace_id: row.get(1).ok(),
                collection_id: row.get(2).ok(),
                name: row.get(3).unwrap_or_default(),
                variables: row.get(4).unwrap_or_default(),
                is_active: row.get::<_, i32>(5).unwrap_or(0) == 1,
                created_at: row.get(6).unwrap_or_default(),
            })
        } else {
            Err("Environment updated but could not be fetched".to_string())
        }
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn delete_environment(
    state: tauri::State<'_, AppState>,
    id: String,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute("DELETE FROM environments WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn set_active_environment(
    state: tauri::State<'_, AppState>,
    id: Option<String>,
    workspace_id: String,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        // Reset all for this workspace
        conn.execute(
            "UPDATE environments SET is_active = 0 WHERE workspace_id = ?1 OR workspace_id IS NULL",
            [&workspace_id],
        )
        .map_err(|e| e.to_string())?;

        // Set the active one
        if let Some(id) = id {
            conn.execute("UPDATE environments SET is_active = 1 WHERE id = ?1", [&id])
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HistoryEntry {
    pub id: String,
    pub workspace_id: String,
    pub request_id: Option<String>,
    pub method: String,
    pub url: String,
    pub request_headers: Option<String>,
    pub request_body: Option<String>,
    pub status_code: Option<i32>,
    pub response_body: Option<String>,
    pub response_headers: Option<String>,
    pub time_ms: Option<i32>,
    pub test_results: Option<String>,
    pub body_type: Option<String>,
    pub form_data: Option<String>,
    pub binary_file_path: Option<String>,
    pub executed_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HistorySaveArgs {
    pub id: String,
    pub workspace_id: String,
    pub request_id: Option<String>,
    pub method: String,
    pub url: String,
    pub request_headers: Option<String>,
    pub request_body: Option<String>,
    pub status_code: Option<i32>,
    pub response_body: Option<String>,
    pub response_headers: Option<String>,
    pub time_ms: Option<i32>,
    pub test_results: Option<String>,
    pub body_type: Option<String>,
    pub form_data: Option<String>,
    pub binary_file_path: Option<String>,
}

#[tauri::command]
pub fn save_history_entry(
    state: tauri::State<'_, AppState>,
    args: HistorySaveArgs,
) -> std::result::Result<(), String> {
    println!("Saving history entry: {} {}", args.method, args.url);
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO request_history (id, workspace_id, request_id, method, url, request_headers, request_body, status_code, response_body, response_headers, time_ms, test_results, body_type, form_data, binary_file_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            rusqlite::params![
                args.id, 
                args.workspace_id, 
                args.request_id, 
                args.method, 
                args.url, 
                args.request_headers, 
                args.request_body, 
                args.status_code, 
                args.response_body, 
                args.response_headers, 
                args.time_ms, 
                args.test_results, 
                args.body_type, 
                args.form_data, 
                args.binary_file_path
            ],
        ).map_err(|e| {
            println!("Error saving history entry: {}", e);
            e.to_string()
        })?;
        println!("History entry saved successfully");
        // Keep only the last 200 entries per workspace
        conn.execute(
            "DELETE FROM request_history WHERE workspace_id = ?1 AND id NOT IN (SELECT id FROM request_history WHERE workspace_id = ?1 ORDER BY executed_at DESC LIMIT 200)",
            [&args.workspace_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn get_history(
    state: tauri::State<'_, AppState>,
    workspace_id: String,
) -> std::result::Result<Vec<HistoryEntry>, String> {
    println!("Fetching history for workspace: {}", workspace_id);
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, request_id, method, url, request_headers, request_body, status_code, response_body, response_headers, time_ms, test_results, body_type, form_data, binary_file_path, executed_at FROM request_history WHERE workspace_id = ?1 ORDER BY executed_at DESC LIMIT 200"
        ).map_err(|e| {
            println!("Error preparing get_history query: {}", e);
            e.to_string()
        })?;
        println!("Executing get_history query...");
        let entries = stmt
            .query_map([&workspace_id], |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    request_id: row.get(2)?,
                    method: row.get(3)?,
                    url: row.get(4)?,
                    request_headers: row.get(5)?,
                    request_body: row.get(6)?,
                    status_code: row.get(7)?,
                    response_body: row.get(8)?,
                    response_headers: row.get(9)?,
                    time_ms: row.get(10)?,
                    test_results: row.get(11)?,
                    body_type: row.get(12)?,
                    form_data: row.get(13)?,
                    binary_file_path: row.get(14)?,
                    executed_at: row.get(15)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let result: Vec<HistoryEntry> = entries.filter_map(|e| e.ok()).collect();
        Ok(result)
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn clear_history(
    state: tauri::State<'_, AppState>,
    workspace_id: String,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "DELETE FROM request_history WHERE workspace_id = ?1",
            [&workspace_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn get_globals(
    state: tauri::State<'_, AppState>,
) -> std::result::Result<String, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let mut stmt = conn
            .prepare("SELECT variables FROM globals WHERE id = 'global_settings_1'")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(row.get(0).unwrap_or_else(|_| "{}".to_string()))
        } else {
            Ok("{}".to_string())
        }
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn update_globals(
    state: tauri::State<'_, AppState>,
    variables: String,
) -> std::result::Result<(), String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT OR REPLACE INTO globals (id, variables) VALUES ('global_settings_1', ?1)",
            [&variables],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Database not initialized".to_string())
    }
}
