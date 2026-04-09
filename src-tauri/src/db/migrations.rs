use super::Database;

/// All migration SQL statements in order.
/// Each migration is idempotent (uses IF NOT EXISTS).
const MIGRATIONS: &[&str] = &[
    // Migration 0001: Create worlds table
    r#"
    CREATE TABLE IF NOT EXISTS worlds (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL DEFAULT '#6366f1',
        created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
        updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
    );
    "#,
    // Migration 0002: Create nodes table
    r#"
    CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY NOT NULL,
        world_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        content_plain TEXT NOT NULL DEFAULT '',
        node_type TEXT NOT NULL DEFAULT 'user',
        position_x REAL NOT NULL DEFAULT 0.0,
        position_y REAL NOT NULL DEFAULT 0.0,
        position_z REAL NOT NULL DEFAULT 0.0,
        color TEXT NOT NULL DEFAULT '#8b5cf6',
        size REAL NOT NULL DEFAULT 1.0,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
        updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
        FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
    );
    "#,
    // Migration 0003: Create edges table
    r#"
    CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY NOT NULL,
        world_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        label TEXT,
        edge_type TEXT NOT NULL DEFAULT 'manual',
        weight REAL NOT NULL DEFAULT 1.0,
        created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
        FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE,
        FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE
    );
    "#,
    // Migration 0004: Create embeddings virtual table (sqlite-vec)
    r#"
    CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
        embedding float[1024]
    );
    "#,
    // Migration 0005: Create embeddings metadata table
    r#"
    CREATE TABLE IF NOT EXISTS embeddings_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        embedding_rowid INTEGER NOT NULL,
        node_id TEXT NOT NULL,
        chunk_text TEXT NOT NULL,
        chunk_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
        FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    );
    "#,
    // Migration 0006: Create nodes FTS5 full-text search index
    r#"
    CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        title,
        content_plain,
        content='nodes',
        content_rowid='rowid'
    );
    "#,
    // Migration 0007: Create migration tracking table
    r#"
    CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (DATETIME('now'))
    );
    "#,
];

impl Database {
    /// Run all pending migrations
    pub fn run_migrations(&self) {
        println!("[MIGRATIONS] Running migrations...");

        // Ensure _migrations table exists first (bootstrap)
        self.execute_sql(MIGRATIONS[MIGRATIONS.len() - 1])
            .expect("Couldn't create _migrations table");

        // Get the last applied migration version
        let last_version: i64 = self
            .connection
            .query_row(
                "SELECT COALESCE(MAX(version), -1) FROM _migrations",
                [],
                |row| row.get(0),
            )
            .unwrap_or(-1);

        println!("[MIGRATIONS] Last applied version: {}", last_version);

        // Run each migration that hasn't been applied yet
        for (i, sql) in MIGRATIONS.iter().enumerate() {
            let version = i as i64;
            if version > last_version {
                println!("[MIGRATIONS] Applying migration {}...", version);
                match self.execute_sql(sql) {
                    Ok(_) => {
                        // Record the migration
                        self.connection
                            .execute(
                                "INSERT INTO _migrations (version) VALUES (?1)",
                                rusqlite::params![version],
                            )
                            .expect("Couldn't record migration");
                        println!("[MIGRATIONS] Migration {} applied successfully", version);
                    }
                    Err(e) => {
                        eprintln!("[MIGRATIONS] Failed to apply migration {}: {}", version, e);
                    }
                }
            }
        }

        println!("[MIGRATIONS] All migrations applied");
    }
}
