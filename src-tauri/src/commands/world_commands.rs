use crate::db::models::worlds::{CreateWorldInput, World};
use crate::DatabaseState;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn create_world(
    state: State<'_, Mutex<DatabaseState>>,
    input: CreateWorldInput,
) -> Result<World, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.create_world(&input)
}

#[tauri::command]
pub fn get_all_worlds(state: State<'_, Mutex<DatabaseState>>) -> Result<Vec<World>, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.get_all_worlds()
}

#[tauri::command]
pub fn get_world(state: State<'_, Mutex<DatabaseState>>, id: String) -> Result<World, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.get_world(&id)
}

#[tauri::command]
pub fn update_world(
    state: State<'_, Mutex<DatabaseState>>,
    id: String,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<World, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state
        .database
        .update_world(&id, &name, description.as_deref(), color.as_deref())
}

#[tauri::command]
pub fn delete_world(state: State<'_, Mutex<DatabaseState>>, id: String) -> Result<(), String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.delete_world(&id)
}
