mod commands;
mod db;

use db::Database;
use std::sync::Mutex;
use tauri::Manager;

/// Global app state holding the database connection
pub struct DatabaseState {
    pub database: Database,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize sqlite-vec extension before any DB connection
    db::setup_sqlite_extensions();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Get the app local data directory to store DB
            let app_data_dir = app
                .path()
                .app_local_data_dir()
                .expect("Couldn't get app local data directory");

            println!("[APP] App data directory: {:?}", app_data_dir);

            // Create and initialize the database
            match Database::new(&app_data_dir) {
                Ok(database) => {
                    database.check_version();
                    database.run_migrations();

                    // Store DB in global app state
                    app.manage(Mutex::new(DatabaseState { database }));

                    println!("[APP] Database initialized successfully");
                }
                Err(error) => {
                    eprintln!("[APP] Failed to initialize database: {}", error);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // World commands
            commands::world_commands::create_world,
            commands::world_commands::get_all_worlds,
            commands::world_commands::get_world,
            commands::world_commands::update_world,
            commands::world_commands::delete_world,
            // Node commands
            commands::node_commands::create_node,
            commands::node_commands::get_nodes_by_world,
            commands::node_commands::get_node,
            commands::node_commands::update_node,
            commands::node_commands::delete_node,
            // Edge commands
            commands::edge_commands::create_edge,
            commands::edge_commands::get_edges_by_world,
            commands::edge_commands::delete_edge,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
