use crate::db::models::nodes::{CreateNodeInput, Node, UpdateNodeInput};
use crate::DatabaseState;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn create_node(
    state: State<'_, Mutex<DatabaseState>>,
    input: CreateNodeInput,
) -> Result<Node, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.create_node(&input)
}

#[tauri::command]
pub fn get_nodes_by_world(
    state: State<'_, Mutex<DatabaseState>>,
    world_id: String,
) -> Result<Vec<Node>, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.get_nodes_by_world(&world_id)
}

#[tauri::command]
pub fn get_node(state: State<'_, Mutex<DatabaseState>>, id: String) -> Result<Node, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.get_node(&id)
}

#[tauri::command]
pub fn update_node(
    state: State<'_, Mutex<DatabaseState>>,
    id: String,
    input: UpdateNodeInput,
) -> Result<Node, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.update_node(&id, &input)
}

#[tauri::command]
pub fn delete_node(state: State<'_, Mutex<DatabaseState>>, id: String) -> Result<(), String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.delete_node(&id)
}
