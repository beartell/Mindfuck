use crate::db::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Node {
    pub id: String,
    pub world_id: String,
    pub title: String,
    pub content: String,
    pub content_plain: String,
    pub node_type: String,
    pub position_x: f64,
    pub position_y: f64,
    pub position_z: f64,
    pub color: String,
    pub size: f64,
    pub metadata: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNodeInput {
    pub id: String,
    pub world_id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub content_plain: Option<String>,
    pub node_type: Option<String>,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub position_z: Option<f64>,
    pub color: Option<String>,
    pub size: Option<f64>,
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNodeInput {
    pub title: Option<String>,
    pub content: Option<String>,
    pub content_plain: Option<String>,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub position_z: Option<f64>,
    pub color: Option<String>,
    pub size: Option<f64>,
    pub metadata: Option<String>,
}

fn row_to_node(row: &rusqlite::Row) -> rusqlite::Result<Node> {
    Ok(Node {
        id: row.get(0)?,
        world_id: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        content_plain: row.get(4)?,
        node_type: row.get(5)?,
        position_x: row.get(6)?,
        position_y: row.get(7)?,
        position_z: row.get(8)?,
        color: row.get(9)?,
        size: row.get(10)?,
        metadata: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

const SELECT_COLS: &str = "id, world_id, title, content, content_plain, node_type, position_x, position_y, position_z, color, size, metadata, created_at, updated_at";

impl Database {
    pub fn create_node(&self, input: &CreateNodeInput) -> Result<Node, String> {
        let title = input.title.clone().unwrap_or_default();
        let content = input.content.clone().unwrap_or_default();
        let content_plain = input.content_plain.clone().unwrap_or_default();
        let node_type = input
            .node_type
            .clone()
            .unwrap_or_else(|| "user".to_string());
        let px = input.position_x.unwrap_or(0.0);
        let py = input.position_y.unwrap_or(0.0);
        let pz = input.position_z.unwrap_or(0.0);
        let color = input.color.clone().unwrap_or_else(|| "#8b5cf6".to_string());
        let size = input.size.unwrap_or(1.0);

        self.connection
            .execute(
                "INSERT INTO nodes (id, world_id, title, content, content_plain, node_type, position_x, position_y, position_z, color, size, metadata)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![
                    input.id,
                    input.world_id,
                    title,
                    content,
                    content_plain,
                    node_type,
                    px,
                    py,
                    pz,
                    color,
                    size,
                    input.metadata,
                ],
            )
            .map_err(|e| format!("Failed to create node: {}", e))?;

        self.get_node(&input.id)
    }

    pub fn get_node(&self, id: &str) -> Result<Node, String> {
        let sql = format!("SELECT {} FROM nodes WHERE id = ?1", SELECT_COLS);
        self.connection
            .query_row(&sql, params![id], row_to_node)
            .map_err(|e| format!("Node not found: {}", e))
    }

    pub fn get_nodes_by_world(&self, world_id: &str) -> Result<Vec<Node>, String> {
        let sql = format!(
            "SELECT {} FROM nodes WHERE world_id = ?1 ORDER BY created_at ASC",
            SELECT_COLS
        );
        let mut stmt = self
            .connection
            .prepare(&sql)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let nodes = stmt
            .query_map(params![world_id], row_to_node)
            .map_err(|e| format!("Failed to query nodes: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect nodes: {}", e))?;

        Ok(nodes)
    }

    pub fn update_node(&self, id: &str, input: &UpdateNodeInput) -> Result<Node, String> {
        // Build dynamic UPDATE query
        let mut sets: Vec<String> = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref title) = input.title {
            sets.push(format!("title = ?{}", sets.len() + 1));
            param_values.push(Box::new(title.clone()));
        }
        if let Some(ref content) = input.content {
            sets.push(format!("content = ?{}", sets.len() + 1));
            param_values.push(Box::new(content.clone()));
        }
        if let Some(ref content_plain) = input.content_plain {
            sets.push(format!("content_plain = ?{}", sets.len() + 1));
            param_values.push(Box::new(content_plain.clone()));
        }
        if let Some(px) = input.position_x {
            sets.push(format!("position_x = ?{}", sets.len() + 1));
            param_values.push(Box::new(px));
        }
        if let Some(py) = input.position_y {
            sets.push(format!("position_y = ?{}", sets.len() + 1));
            param_values.push(Box::new(py));
        }
        if let Some(pz) = input.position_z {
            sets.push(format!("position_z = ?{}", sets.len() + 1));
            param_values.push(Box::new(pz));
        }
        if let Some(ref color) = input.color {
            sets.push(format!("color = ?{}", sets.len() + 1));
            param_values.push(Box::new(color.clone()));
        }
        if let Some(size) = input.size {
            sets.push(format!("size = ?{}", sets.len() + 1));
            param_values.push(Box::new(size));
        }
        if let Some(ref metadata) = input.metadata {
            sets.push(format!("metadata = ?{}", sets.len() + 1));
            param_values.push(Box::new(metadata.clone()));
        }

        if sets.is_empty() {
            return self.get_node(id);
        }

        // Always update updated_at
        sets.push(format!("updated_at = DATETIME('now')"));

        let id_param_idx = param_values.len() + 1;
        param_values.push(Box::new(id.to_string()));

        let sql = format!(
            "UPDATE nodes SET {} WHERE id = ?{}",
            sets.join(", "),
            id_param_idx
        );

        let params_refs: Vec<&dyn rusqlite::types::ToSql> =
            param_values.iter().map(|p| p.as_ref()).collect();

        self.connection
            .execute(&sql, params_refs.as_slice())
            .map_err(|e| format!("Failed to update node: {}", e))?;

        self.get_node(id)
    }

    pub fn delete_node(&self, id: &str) -> Result<(), String> {
        self.connection
            .execute("DELETE FROM nodes WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete node: {}", e))?;
        Ok(())
    }
}
