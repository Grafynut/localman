use clap::Parser;
use localman_lib::http::{execute_request, HttpRequestParams};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(author, version, about = "CLI Runner for Localman Collections")]
struct Args {
    /// Path to the workspace JSON file
    #[arg(short, long)]
    file: PathBuf,

    /// Path to an environment JSON file (optional)
    #[arg(short, long)]
    env: Option<PathBuf>,

    /// Specific collection name to run (runs all if not specified)
    #[arg(short, long)]
    collection: Option<String>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
struct WorkspaceData {
    collections: Vec<Collection>,
    requests: HashMap<String, Vec<StoredRequest>>,
    #[serde(default)]
    environments: Vec<Environment>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
struct Collection {
    id: String,
    name: String,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
struct Environment {
    id: String,
    name: String,
    variables: String, // JSON string
    is_active: bool,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
struct StoredRequest {
    id: String,
    name: String,
    method: String,
    url: String,
    headers: Option<String>,
    body: Option<String>,
    body_type: Option<String>,
    form_data: Option<String>, // JSON string
    binary_file_path: Option<String>,
    auth: Option<String>, // JSON string
}

fn resolve_variables(text: &str, context: &HashMap<String, String>) -> String {
    let mut result = text.to_string();
    for (key, value) in context {
        let placeholder = format!("{{{{{}}}}}", key);
        result = result.replace(&placeholder, value);
    }
    result
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // 1. Load Workspace
    let workspace_content = fs::read_to_string(&args.file)?;
    let workspace: WorkspaceData = serde_json::from_str(&workspace_content)?;

    // 2. Load Environment
    let mut variables = HashMap::new();
    if let Some(env_path) = args.env {
        let env_content = fs::read_to_string(env_path)?;
        let env_data: HashMap<String, String> = serde_json::from_str(&env_content)?;
        variables.extend(env_data);
    } else {
        // Fallback to active environment in workspace if any
        if let Some(active_env) = workspace.environments.iter().find(|e| e.is_active) {
            if let Ok(env_vars) = serde_json::from_str::<HashMap<String, String>>(&active_env.variables) {
                variables.extend(env_vars);
            }
        }
    }

    println!("🚀 Starting Localman CLI Runner");
    println!("📂 Using workspace: {}", args.file.display());
    if !variables.is_empty() {
        println!("🌐 Loaded {} variables", variables.len());
    }

    // 3. Filter Collections
    let collections_to_run = if let Some(target_name) = args.collection {
        workspace.collections.into_iter().filter(|c| c.name == target_name).collect::<Vec<_>>()
    } else {
        workspace.collections
    };

    if collections_to_run.is_empty() {
        println!("❌ No matching collections found.");
        return Ok(());
    }

    // 4. Run Loop
    for col in collections_to_run {
        println!("\n📦 Collection: {}", col.name);
        let requests = workspace.requests.get(&col.id).cloned().unwrap_or_default();
        
        for req in requests {
            println!("  ➡️ Running: {} {} ({})", req.method, req.name, req.url);
            
            let resolved_url = resolve_variables(&req.url, &variables);
            
            let mut resolved_headers = HashMap::new();
            if let Some(headers_json) = &req.headers {
                if let Ok(headers) = serde_json::from_str::<HashMap<String, String>>(headers_json) {
                    for (k, v) in headers {
                        resolved_headers.insert(k, resolve_variables(&v, &variables));
                    }
                }
            }
            let mut final_body_type = req.body_type.unwrap_or_else(|| "none".to_string());
            let mut resolved_body = req.body.as_ref().map(|b| resolve_variables(b, &variables));

            if final_body_type == "graphql" {
                if let Some(body_json) = &req.body {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(body_json) {
                        let query = parsed["query"].as_str().unwrap_or("");
                        let vars_str = parsed["variables"].as_str().unwrap_or("");
                        
                        let mut variables_obj = serde_json::Map::new();
                        if !vars_str.is_empty() {
                            let resolved_vars_str = resolve_variables(vars_str, &variables);
                            if let Ok(vars_json) = serde_json::from_str::<serde_json::Value>(&resolved_vars_str) {
                                if let Some(obj) = vars_json.as_object() {
                                    variables_obj = obj.clone();
                                }
                            }
                        }

                        resolved_body = Some(serde_json::json!({
                            "query": resolve_variables(query, &variables),
                            "variables": variables_obj
                        }).to_string());
                        final_body_type = "raw".to_string();
                        if !resolved_headers.contains_key("Content-Type") {
                            resolved_headers.insert("Content-Type".to_string(), "application/json".to_string());
                        }
                    }
                }
            }

            let params = HttpRequestParams {
                method: req.method,
                url: resolved_url,
                headers: Some(resolved_headers),
                body: resolved_body,
                body_type: Some(final_body_type),
                form_data: req.form_data.and_then(|fd| {
                    serde_json::from_str(&fd).ok().map(|entries: Vec<serde_json::Value>| {
                        entries.into_iter().map(|e| {
                            use localman_lib::http::FormDataEntry;
                            FormDataEntry {
                                key: resolve_variables(e["key"].as_str().unwrap_or(""), &variables),
                                value: if e["type"].as_str().unwrap_or("text") == "text" {
                                    resolve_variables(e["value"].as_str().unwrap_or(""), &variables)
                                } else {
                                    e["value"].as_str().unwrap_or("").to_string()
                                },
                                r#type: e["type"].as_str().unwrap_or("text").to_string(),
                                enabled: e["enabled"].as_bool().unwrap_or(true),
                            }
                        }).collect()
                    })
                }),
                binary_file_path: req.binary_file_path.map(|p| resolve_variables(&p, &variables)),
                auth: req.auth.and_then(|a| serde_json::from_str(&a).ok()),
            };

            match execute_request(params).await {
                Ok(res) => {
                    println!("  ✅ Status: {} ({}ms)", res.status, res.time_ms);
                    // println!("  📄 Body: {}", res.body);
                }
                Err(e) => {
                    println!("  ❌ Error: {}", e);
                }
            }
        }
    }

    println!("\n✨ Run completed!");
    Ok(())
}
