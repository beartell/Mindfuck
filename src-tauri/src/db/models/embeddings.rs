use crate::db::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use zerocopy::AsBytes;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmbeddingMetadata {
    pub id: i64,
    pub embedding_rowid: i64,
    pub node_id: String,
    pub chunk_text: String,
    pub chunk_index: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbeddingSearchResult {
    pub rowid: i64,
    pub distance: f64,
    pub node_id: String,
    pub chunk_text: String,
}

impl Database {
    /// Insert an embedding vector and its metadata
    pub fn insert_embedding(
        &self,
        node_id: &str,
        chunk_text: &str,
        chunk_index: i64,
        embedding: &[f32],
    ) -> Result<i64, String> {
        // Insert the vector into sqlite-vec virtual table
        self.connection
            .execute(
                "INSERT INTO embeddings (embedding) VALUES (?1)",
                params![embedding.as_bytes()],
            )
            .map_err(|e| format!("Failed to insert embedding: {}", e))?;

        let rowid = self.connection.last_insert_rowid();

        // Insert metadata
        self.connection
            .execute(
                "INSERT INTO embeddings_metadata (embedding_rowid, node_id, chunk_text, chunk_index)
                 VALUES (?1, ?2, ?3, ?4)",
                params![rowid, node_id, chunk_text, chunk_index],
            )
            .map_err(|e| format!("Failed to insert embedding metadata: {}", e))?;

        Ok(rowid)
    }

    /// Query embeddings by vector similarity, returns top-k results
    pub fn query_embeddings(
        &self,
        query_embedding: &[f32],
        limit: i64,
    ) -> Result<Vec<EmbeddingSearchResult>, String> {
        let sql = r#"
            SELECT
                e.rowid,
                e.distance,
                m.node_id,
                m.chunk_text
            FROM embeddings e
            INNER JOIN embeddings_metadata m ON m.embedding_rowid = e.rowid
            WHERE e.embedding MATCH ?1
            ORDER BY e.distance
            LIMIT ?2
        "#;

        let mut stmt = self
            .connection
            .prepare(sql)
            .map_err(|e| format!("Failed to prepare embedding query: {}", e))?;

        let results = stmt
            .query_map(params![query_embedding.as_bytes(), limit], |row| {
                Ok(EmbeddingSearchResult {
                    rowid: row.get(0)?,
                    distance: row.get(1)?,
                    node_id: row.get(2)?,
                    chunk_text: row.get(3)?,
                })
            })
            .map_err(|e| format!("Failed to query embeddings: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect embedding results: {}", e))?;

        Ok(results)
    }

    /// Delete all embeddings for a given node
    pub fn delete_embeddings_for_node(&self, node_id: &str) -> Result<(), String> {
        // First get the rowids to delete from the virtual table
        let mut stmt = self
            .connection
            .prepare("SELECT embedding_rowid FROM embeddings_metadata WHERE node_id = ?1")
            .map_err(|e| format!("Failed to prepare: {}", e))?;

        let rowids: Vec<i64> = stmt
            .query_map(params![node_id], |row| row.get(0))
            .map_err(|e| format!("Failed to query: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect: {}", e))?;

        // Delete from virtual table
        for rowid in &rowids {
            self.connection
                .execute("DELETE FROM embeddings WHERE rowid = ?1", params![rowid])
                .map_err(|e| format!("Failed to delete embedding: {}", e))?;
        }

        // Delete metadata
        self.connection
            .execute(
                "DELETE FROM embeddings_metadata WHERE node_id = ?1",
                params![node_id],
            )
            .map_err(|e| format!("Failed to delete embedding metadata: {}", e))?;

        Ok(())
    }
}
