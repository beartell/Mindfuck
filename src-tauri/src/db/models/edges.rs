use crate::db::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Edge {
    pub id: String,
    pub world_id: String,
    pub source_id: String,
    pub target_id: String,
    pub label: Option<String>,
    pub edge_type: String,
    pub weight: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEdgeInput {
    pub id: String,
    pub world_id: String,
    pub source_id: String,
    pub target_id: String,
    pub label: Option<String>,
    pub edge_type: Option<String>,
    pub weight: Option<f64>,
}

fn row_to_edge(row: &rusqlite::Row) -> rusqlite::Result<Edge> {
    Ok(Edge {
        id: row.get(0)?,
        world_id: row.get(1)?,
        source_id: row.get(2)?,
        target_id: row.get(3)?,
        label: row.get(4)?,
        edge_type: row.get(5)?,
        weight: row.get(6)?,
        created_at: row.get(7)?,
    })
}

const SELECT_COLS: &str =
    "id, world_id, source_id, target_id, label, edge_type, weight, created_at";

impl Database {
    pub fn create_edge(&self, input: &CreateEdgeInput) -> Result<Edge, String> {
        let edge_type = input
            .edge_type
            .clone()
            .unwrap_or_else(|| "manual".to_string());
        let weight = input.weight.unwrap_or(1.0);

        self.connection
            .execute(
                "INSERT INTO edges (id, world_id, source_id, target_id, label, edge_type, weight)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    input.id,
                    input.world_id,
                    input.source_id,
                    input.target_id,
                    input.label,
                    edge_type,
                    weight,
                ],
            )
            .map_err(|e| format!("Failed to create edge: {}", e))?;

        self.get_edge(&input.id)
    }

    pub fn get_edge(&self, id: &str) -> Result<Edge, String> {
        let sql = format!("SELECT {} FROM edges WHERE id = ?1", SELECT_COLS);
        self.connection
            .query_row(&sql, params![id], row_to_edge)
            .map_err(|e| format!("Edge not found: {}", e))
    }

    pub fn get_edges_by_world(&self, world_id: &str) -> Result<Vec<Edge>, String> {
        let sql = format!(
            "SELECT {} FROM edges WHERE world_id = ?1 ORDER BY created_at ASC",
            SELECT_COLS
        );
        let mut stmt = self
            .connection
            .prepare(&sql)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let edges = stmt
            .query_map(params![world_id], row_to_edge)
            .map_err(|e| format!("Failed to query edges: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect edges: {}", e))?;

        Ok(edges)
    }

    pub fn delete_edge(&self, id: &str) -> Result<(), String> {
        self.connection
            .execute("DELETE FROM edges WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete edge: {}", e))?;
        Ok(())
    }
}
