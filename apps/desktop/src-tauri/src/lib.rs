// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn create_profile(profile: serde_json::Value) -> Result<serde_json::Value, String> {
    use tauri_plugin_sql::Migration;

    let manager = tauri_plugin_sql::SqliteManager::default();

    let db = manager.open("besire.sqlite").map_err(|e| e.to_string())?;

    // Create profiles table if not exists
    db.execute(
        "CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
        [],
    )
    .map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let data_json = serde_json::to_string(&profile).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO profiles (id, data) VALUES (?1, ?2)",
        [&id, &data_json],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
async fn get_profile() -> Result<serde_json::Value, String> {
    use tauri_plugin_sql::Migration;

    let manager = tauri_plugin_sql::SqliteManager::default();

    let db = manager.open("besire.sqlite").map_err(|e| e.to_string())?;

    let mut rows = db
        .query_row(
            "SELECT id, data FROM profiles LIMIT 1",
            [],
            |row| {
                let id: String = row.get(0).map_err(|e| e.to_string())?;
                let data: String = row.get(1).map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "id": id, "data": serde_json::from_str::<serde_json::Value>(&data).map_err(|e| e.to_string())? }))
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    match rows {
        Some(profile) => Ok(profile),
        None => Ok(serde_json::json!({ "id": null, "data": null })),
    }
}

#[tauri::command]
async fn update_profile(id: &str, profile: serde_json::Value) -> Result<serde_json::Value, String> {
    use tauri_plugin_sql::Migration;

    let manager = tauri_plugin_sql::SqliteManager::default();

    let db = manager.open("besire.sqlite").map_err(|e| e.to_string())?;

    let data_json = serde_json::to_string(&profile).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE profiles SET data = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        [&id, &data_json],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "id": id }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_profile,
            get_profile,
            update_profile
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}