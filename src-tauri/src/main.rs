// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod commands;
mod attachments;
mod notifications;

use std::sync::Mutex;
use tauri::{Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, CustomMenuItem};

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let open = CustomMenuItem::new("open".to_string(), "Open App");
    let quick_add = CustomMenuItem::new("quick_add".to_string(), "Quick Add");
    let toggle_theme = CustomMenuItem::new("toggle_theme".to_string(), "Toggle Theme");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(open)
        .add_item(quick_add)
        .add_item(toggle_theme)
        .add_item(quit);
    
    let system_tray = SystemTray::new().with_menu(tray_menu);
    
    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "quit" => {
                            std::process::exit(0);
                        }
                        "open" => {
                            if let Some(window) = app.get_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        "quick_add" => {
                            if let Some(window) = app.get_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                                // Send message to frontend to open AddTask modal
                                window.emit("quick-add", ()).ok();
                            }
                        }
                        "toggle_theme" => {
                            if let Some(window) = app.get_window("main") {
                                window.emit("toggle-theme", ()).ok();
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .setup(|app| {
            // Initialize database
            let app_handle = app.handle().clone();
            let db = db::init_db(&app_handle)
                .expect("Failed to initialize database");
            
            // Check for notifications on startup
            let _ = notifications::check_and_schedule_notifications(&app_handle, &db);
            
            // Store database connection in app state
            app.manage(Mutex::new(db));
            
            // Hide window on close if minimize to tray is enabled
            let app_handle_clone = app.handle().clone();
            if let Some(window) = app.get_window("main") {
                window.listen("tauri://close-requested", move |_| {
                    // Check if minimize to tray is enabled
                    // For now, always minimize to tray
                    if let Some(window) = app_handle_clone.get_window("main") {
                        window.hide().ok();
                    }
                });
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::get_task,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::toggle_complete,
            commands::get_projects,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::add_subtask,
            commands::update_subtask,
            commands::delete_subtask,
            commands::get_subtasks,
            commands::get_attachments,
            commands::add_attachment,
            commands::delete_attachment,
            commands::get_settings,
            commands::update_settings,
            commands::create_backup,
            commands::restore_backup,
            commands::export_data,
            commands::import_data,
            commands::show_notification,
            commands::get_autostart_enabled,
            commands::set_autostart_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
