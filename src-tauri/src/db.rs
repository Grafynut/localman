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
        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS requests (
            id TEXT PRIMARY KEY,
            collection_id TEXT NOT NULL,
            name TEXT NOT NULL,
            method TEXT NOT NULL,
            url TEXT NOT NULL,
            headers TEXT,
            body TEXT,
            FOREIGN KEY(collection_id) REFERENCES collections(id)
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

    Ok(conn)
}

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub owner_id: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StoredRequest {
    pub id: String,
    pub collection_id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Option<String>,
    pub body: Option<String>,
}

fn fetch_collection_by_id(conn: &Connection, id: &str) -> std::result::Result<Collection, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, owner_id, created_at FROM collections WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Collection {
            id: row.get(0).unwrap_or_default(),
            name: row.get(1).unwrap_or_default(),
            owner_id: row.get(2).unwrap_or_default(),
            created_at: row.get(3).unwrap_or_default(),
        })
    } else {
        Err("Collection not found".to_string())
    }
}

fn fetch_request_by_id(conn: &Connection, id: &str) -> std::result::Result<StoredRequest, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, collection_id, name, method, url, headers, body
             FROM requests
             WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(StoredRequest {
            id: row.get(0).unwrap_or_default(),
            collection_id: row.get(1).unwrap_or_default(),
            name: row.get(2).unwrap_or_default(),
            method: row.get(3).unwrap_or_default(),
            url: row.get(4).unwrap_or_default(),
            headers: row.get(5).ok(),
            body: row.get(6).ok(),
        })
    } else {
        Err("Request not found".to_string())
    }
}

#[tauri::command]
pub fn create_collection(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    owner_id: String,
) -> std::result::Result<Collection, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO collections (id, name, owner_id) VALUES (?1, ?2, ?3)",
            (&id, &name, &owner_id),
        )
        .map_err(|e| e.to_string())?;

        // Fetch it back to return complete struct including created_at
        let mut stmt = conn
            .prepare("SELECT id, name, owner_id, created_at FROM collections WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Collection {
                id: row.get(0).unwrap_or_default(),
                name: row.get(1).unwrap_or_default(),
                owner_id: row.get(2).unwrap_or_default(),
                created_at: row.get(3).unwrap_or_default(),
            })
        } else {
            Err("Collection created but could not be fetched".to_string())
        }
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub fn get_collections(
    state: tauri::State<'_, AppState>,
    owner_id: String,
) -> std::result::Result<Vec<Collection>, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        let mut stmt = conn
            .prepare("SELECT id, name, owner_id, created_at FROM collections WHERE owner_id = ?1")
            .map_err(|e| e.to_string())?;
        let collection_iter = stmt
            .query_map([&owner_id], |row| {
                Ok(Collection {
                    id: row.get(0).unwrap_or_default(),
                    name: row.get(1).unwrap_or_default(),
                    owner_id: row.get(2).unwrap_or_default(),
                    created_at: row.get(3).unwrap_or_default(),
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
    name: String,
    owner_id: String,
) -> std::result::Result<Collection, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO collections (id, name, owner_id)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               owner_id = excluded.owner_id",
            (&id, &name, &owner_id),
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
            "INSERT INTO collections (id, name, owner_id) VALUES (?1, ?2, ?3)",
            (&new_id, &new_name, &source.owner_id),
        )
        .map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT name, method, url, headers, body
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
                ))
            })
            .map_err(|e| e.to_string())?;

        for req in req_iter {
            if let Ok((name, method, url, headers, body)) = req {
                let cloned_id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO requests (id, collection_id, name, method, url, headers, body)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    (&cloned_id, &new_id, &name, &method, &url, &headers, &body),
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
    name: String,
    method: String,
    url: String,
    headers: Option<String>,
    body: Option<String>,
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO requests (id, collection_id, name, method, url, headers, body) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            (&id, &collection_id, &name, &method, &url, &headers, &body),
        ).map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT id, collection_id, name, method, url, headers, body FROM requests WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(StoredRequest {
                id: row.get(0).unwrap_or_default(),
                collection_id: row.get(1).unwrap_or_default(),
                name: row.get(2).unwrap_or_default(),
                method: row.get(3).unwrap_or_default(),
                url: row.get(4).unwrap_or_default(),
                headers: row.get(5).ok(),
                body: row.get(6).ok(),
            })
        } else {
            Err("Request created but could not be fetched".to_string())
        }
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
                "SELECT id, collection_id, name, method, url, headers, body
                 FROM requests
                 WHERE id = ?1",
            )
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([&id]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(StoredRequest {
                id: row.get(0).unwrap_or_default(),
                collection_id: row.get(1).unwrap_or_default(),
                name: row.get(2).unwrap_or_default(),
                method: row.get(3).unwrap_or_default(),
                url: row.get(4).unwrap_or_default(),
                headers: row.get(5).ok(),
                body: row.get(6).ok(),
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
    name: String,
    method: String,
    url: String,
    headers: Option<String>,
    body: Option<String>,
) -> std::result::Result<StoredRequest, String> {
    let lock = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = lock.as_ref() {
        conn.execute(
            "INSERT INTO requests (id, collection_id, name, method, url, headers, body)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
               collection_id = excluded.collection_id,
               name = excluded.name,
               method = excluded.method,
               url = excluded.url,
               headers = excluded.headers,
               body = excluded.body",
            (&id, &collection_id, &name, &method, &url, &headers, &body),
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
            "INSERT INTO requests (id, collection_id, name, method, url, headers, body)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            (
                &new_id,
                &source.collection_id,
                &new_name,
                &source.method,
                &source.url,
                &source.headers,
                &source.body,
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
                "SELECT id, collection_id, name, method, url, headers, body
                 FROM requests
                 WHERE collection_id = ?1
                 ORDER BY rowid DESC",
            )
            .map_err(|e| e.to_string())?;

        let request_iter = stmt
            .query_map([&collection_id], |row| {
                Ok(StoredRequest {
                    id: row.get(0).unwrap_or_default(),
                    collection_id: row.get(1).unwrap_or_default(),
                    name: row.get(2).unwrap_or_default(),
                    method: row.get(3).unwrap_or_default(),
                    url: row.get(4).unwrap_or_default(),
                    headers: row.get(5).ok(),
                    body: row.get(6).ok(),
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
