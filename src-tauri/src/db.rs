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
        "
    )?;
    
    // Migrations: Add missing columns if they don't exist
    // workspace_id for collections
    let _ = conn.execute("ALTER TABLE collections ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default_workspace'", []);
    // folder_id and position for requests
    let _ = conn.execute("ALTER TABLE requests ADD COLUMN folder_id TEXT", []);
    let _ = conn.execute("ALTER TABLE requests ADD COLUMN position INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE requests ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", []);

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
}

fn fetch_collection_by_id(conn: &Connection, id: &str) -> std::result::Result<Collection, String> {
    let mut stmt = conn
        .prepare("SELECT id, workspace_id, name, owner_id, created_at FROM collections WHERE id = ?1")
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
            "SELECT id, collection_id, folder_id, name, method, url, headers, body, position
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
        })
    } else {
        Err("Request not found".to_string())
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
                "SELECT name, method, url, headers, body, folder_id, position
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
                    row.get::<_, i32>(6).unwrap_or_default(),
                ))
            })
            .map_err(|e| e.to_string())?;

        for req in req_iter {
            if let Ok((name, method, url, headers, body, folder_id, position)) = req {
                let cloned_id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO requests (id, collection_id, name, method, url, headers, body, folder_id, position)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    (&cloned_id, &new_id, &name, &method, &url, &headers, &body, &folder_id, &position),
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
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, body, position) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            (&id, &collection_id, &folder_id, &name, &method, &url, &headers, &body, &position),
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
            ).map_err(|e| e.to_string())?;
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
        
        let mut stmt = conn
        .prepare("SELECT id, collection_id, name, position, created_at FROM folders WHERE id = ?1")
        .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Folder {
                id: row.get(0).unwrap_or_default(),
                collection_id: row.get(1).unwrap_or_default(),
                name: row.get(2).unwrap_or_default(),
                position: row.get(3).unwrap_or_default(),
                created_at: row.get(4).unwrap_or_default(),
            })
        } else {
            Err("Folder created but could not be fetched".to_string())
        }
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
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let affected = conn
            .execute(
                "UPDATE requests
                 SET name = ?2, method = ?3, url = ?4, headers = ?5, body = ?6
                 WHERE id = ?1",
                (&id, &name, &method, &url, &headers, &body),
            )
            .map_err(|e| e.to_string())?;

        if affected == 0 {
            return Err("Request not found".to_string());
        }

        let mut stmt = conn
            .prepare(
                "SELECT id, collection_id, folder_id, name, method, url, headers, body, position
                 FROM requests
                 WHERE id = ?1",
            )
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;

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
            })
        } else {
            Err("Updated request could not be fetched".to_string())
        }
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
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, body, position)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
               collection_id = excluded.collection_id,
               folder_id = excluded.folder_id,
               name = excluded.name,
               method = excluded.method,
               url = excluded.url,
               headers = excluded.headers,
               body = excluded.body,
               position = excluded.position",
            (&id, &collection_id, &folder_id, &name, &method, &url, &headers, &body, &position),
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
            "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, body, position)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
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
                "SELECT id, collection_id, folder_id, name, method, url, headers, body, position
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
