use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct HttpRequestParams {
    pub method: String,
    pub url: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
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
    if let Some(body) = params.body {
        request_builder = request_builder.body(body);
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
    let response_body = response.text().await.map_err(|e| e.to_string())?;

    Ok(HttpResponseResult {
        status,
        headers: resp_headers,
        body: response_body,
        time_ms: duration,
    })
}
