use crate::db::models::edges::{CreateEdgeInput, Edge};
use crate::DatabaseState;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn create_edge(
    state: State<'_, Mutex<DatabaseState>>,
    input: CreateEdgeInput,
) -> Result<Edge, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.create_edge(&input)
}

#[tauri::command]
pub fn get_edges_by_world(
    state: State<'_, Mutex<DatabaseState>>,
    world_id: String,
) -> Result<Vec<Edge>, String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.get_edges_by_world(&world_id)
}

#[tauri::command]
pub fn delete_edge(state: State<'_, Mutex<DatabaseState>>, id: String) -> Result<(), String> {
    let state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    state.database.delete_edge(&id)
}
