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
            let resolved_body = req.body.as_ref().map(|b| resolve_variables(b, &variables));
            
            let mut resolved_headers = HashMap::new();
            if let Some(headers_json) = req.headers {
                if let Ok(headers) = serde_json::from_str::<HashMap<String, String>>(&headers_json) {
                    for (k, v) in headers {
                        resolved_headers.insert(k, resolve_variables(&v, &variables));
                    }
                }
            }

            let params = HttpRequestParams {
                method: req.method,
                url: resolved_url,
                headers: Some(resolved_headers),
                body: resolved_body,
                body_type: req.body_type,
                form_data: None, // Simplified for CLI first
                binary_file_path: None,
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
