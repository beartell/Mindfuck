pub mod migrations;
pub mod models;

use rusqlite::{Connection, Result};
use sqlite_vec::sqlite3_vec_init;
use std::fs;
use std::path::PathBuf;

/// Main Database wrapper around rusqlite Connection
pub struct Database {
    pub connection: Connection,
}

impl Database {
    /// Create a new Database connection at the given app data directory
    pub fn new(app_local_path: &PathBuf) -> Result<Database, String> {
        // Create DB folder if necessary
        let db_folder_path = app_local_path.join("db");
        if !db_folder_path.exists() {
            fs::create_dir_all(&db_folder_path)
                .map_err(|e| format!("Couldn't create DB folder: {}", e))?;
        }

        let db_path = db_folder_path.join("mindfuck.db3");
        println!("[DB] Database path: {}", db_path.display());

        let connection =
            Connection::open(&db_path).map_err(|e| format!("Couldn't open SQLite DB: {}", e))?;

        // Enable WAL mode for better concurrent read performance
        connection
            .execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| format!("Couldn't set PRAGMA: {}", e))?;

        Ok(Database { connection })
    }

    /// Check SQLite and sqlite-vec versions
    pub fn check_version(&self) {
        let sqlite_version: String = self
            .connection
            .query_row("SELECT sqlite_version()", [], |row| row.get(0))
            .unwrap_or_else(|_| "unknown".to_string());

        let vec_version: String = self
            .connection
            .query_row("SELECT vec_version()", [], |row| row.get(0))
            .unwrap_or_else(|_| "unknown".to_string());

        println!("[DB] SQLite version: {}", sqlite_version);
        println!("[DB] sqlite-vec version: {}", vec_version);
    }

    /// Execute a SQL statement (for migrations, DDL, etc.)
    pub fn execute_sql(&self, sql: &str) -> Result<()> {
        self.connection.execute_batch(sql)?;
        Ok(())
    }
}

/// Initialize sqlite-vec extension. Must be called before any DB connection is created.
pub fn setup_sqlite_extensions() {
    unsafe {
        rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
            sqlite3_vec_init as *const (),
        )));
    }
    println!("[DB] sqlite-vec extension registered");
}
