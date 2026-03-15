use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct HttpRequestParams {
    pub method: String,
    pub url: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub form_data: Option<Vec<FormDataEntry>>,
    pub binary_file_path: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FormDataEntry {
    pub key: String,
    pub value: String,
    pub r#type: String, // "text" or "file"
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct HttpResponseResult {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time_ms: u64,
}

#[tauri::command]
pub async fn execute_request(params: HttpRequestParams) -> Result<HttpResponseResult, String> {
    let client = reqwest::Client::new();

    // Parse Method
    let method = match params.method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        _ => return Err(format!("Unsupported method: {}", params.method)),
    };

    // Parse Headers
    let mut header_map = HeaderMap::new();
    if let Some(headers) = params.headers {
        for (k, v) in headers {
            if let (Ok(name), Ok(value)) = (
                HeaderName::from_bytes(k.as_bytes()),
                HeaderValue::from_str(&v),
            ) {
                header_map.insert(name, value);
            }
        }
    }

    // Build Request
    let mut request_builder = client.request(method, &params.url).headers(header_map);

    let body_type = params.body_type.unwrap_or_else(|| "raw".to_string());

    match body_type.as_str() {
        "form-data" => {
            if let Some(entries) = params.form_data {
                let mut form = reqwest::multipart::Form::new();
                for entry in entries {
                    if !entry.enabled {
                        continue;
                    }
                    if entry.r#type == "file" {
                        if !entry.value.is_empty() {
                            let path = std::path::Path::new(&entry.value);
                            let file_name = path
                                .file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("file")
                                .to_string();
                            let file_bytes = std::fs::read(&entry.value).map_err(|e| {
                                format!("Failed to read file {}: {}", entry.value, e)
                            })?;
                            let part = reqwest::multipart::Part::bytes(file_bytes).file_name(file_name);
                            form = form.part(entry.key, part);
                        }
                    } else {
                        form = form.text(entry.key, entry.value);
                    }
                }
                request_builder = request_builder.multipart(form);
            }
        }
        "binary" => {
            if let Some(path) = params.binary_file_path {
                if !path.is_empty() {
                    let file_bytes = std::fs::read(&path)
                        .map_err(|e| format!("Failed to read binary file {}: {}", path, e))?;
                    request_builder = request_builder.body(file_bytes);
                }
            }
        }
        "raw" => {
            if let Some(body) = params.body {
                request_builder = request_builder.body(body);
            }
        }
        _ => {} // "none" or other
    }

    // Execute Request
    let start_time = std::time::Instant::now();
    let response = request_builder.send().await.map_err(|e| e.to_string())?;
    let duration = start_time.elapsed().as_millis() as u64;

    let status = response.status().as_u16();

    // Extract response headers
    let mut resp_headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(val_str) = value.to_str() {
            resp_headers.insert(key.to_string(), val_str.to_string());
        }
    }

    // Extract response body
    let content_type = resp_headers.get("content-type").cloned().unwrap_or_default().to_lowercase();
    
    let body = if content_type.starts_with("image/") || 
                   content_type.starts_with("audio/") || 
                   content_type.starts_with("video/") ||
                   content_type.contains("octet-stream") ||
                   content_type.contains("pdf") {
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;
        use base64::{Engine as _, engine::general_purpose};
        let b64 = general_purpose::STANDARD.encode(&bytes);
        format!("data:{};base64,{}", content_type, b64)
    } else {
        response.text().await.map_err(|e| e.to_string())?
    };

    Ok(HttpResponseResult {
        status,
        headers: resp_headers,
        body,
        time_ms: duration,
    })
}
