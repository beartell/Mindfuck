use crate::db::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct World {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWorldInput {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

impl Database {
    pub fn create_world(&self, input: &CreateWorldInput) -> Result<World, String> {
        let color = input.color.clone().unwrap_or_else(|| "#6366f1".to_string());

        self.connection
            .execute(
                "INSERT INTO worlds (id, name, description, color) VALUES (?1, ?2, ?3, ?4)",
                params![input.id, input.name, input.description, color],
            )
            .map_err(|e| format!("Failed to create world: {}", e))?;

        self.get_world(&input.id)
    }

    pub fn get_world(&self, id: &str) -> Result<World, String> {
        self.connection
            .query_row(
                "SELECT id, name, description, color, created_at, updated_at FROM worlds WHERE id = ?1",
                params![id],
                |row| {
                    Ok(World {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        description: row.get(2)?,
                        color: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .map_err(|e| format!("World not found: {}", e))
    }

    pub fn get_all_worlds(&self) -> Result<Vec<World>, String> {
        let mut stmt = self
            .connection
            .prepare("SELECT id, name, description, color, created_at, updated_at FROM worlds ORDER BY updated_at DESC")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let worlds = stmt
            .query_map([], |row| {
                Ok(World {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    color: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|e| format!("Failed to query worlds: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect worlds: {}", e))?;

        Ok(worlds)
    }

    pub fn update_world(
        &self,
        id: &str,
        name: &str,
        description: Option<&str>,
        color: Option<&str>,
    ) -> Result<World, String> {
        self.connection
            .execute(
                "UPDATE worlds SET name = ?1, description = ?2, color = COALESCE(?3, color), updated_at = DATETIME('now') WHERE id = ?4",
                params![name, description, color, id],
            )
            .map_err(|e| format!("Failed to update world: {}", e))?;

        self.get_world(id)
    }

    pub fn delete_world(&self, id: &str) -> Result<(), String> {
        self.connection
            .execute("DELETE FROM worlds WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete world: {}", e))?;
        Ok(())
    }
}
