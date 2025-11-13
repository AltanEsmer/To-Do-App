// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod commands;
mod attachments;
mod notifications;
mod services;

use std::sync::{Arc, Mutex};
use tauri::{Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, CustomMenuItem, GlobalShortcutManager};

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
            let db_for_app = Arc::new(Mutex::new(db));
            let db_for_thread = db_for_app.clone();
            
            // Check streak on startup (before app state is managed, use direct connection)
            // We can't use State in setup, so we'll call the internal function directly
            {
                if let Ok(db_lock) = db_for_app.lock() {
                    let _ = commands::update_streak_internal(&db_lock.conn);
                }
            }
            
            app.manage(db_for_app);
            
            // Set up periodic notification checker (every minute)
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(60));
                    if let Ok(db_lock) = db_for_thread.lock() {
                        let _ = notifications::check_due_notifications(&db_lock);
                    }
                }
            });
            
            // Register global shortcuts
            let app_handle_shortcuts = app.handle().clone();
            app.global_shortcut_manager().register("Ctrl+Shift+A", move || {
                if let Some(window) = app_handle_shortcuts.get_window("main") {
                    window.show().ok();
                    window.set_focus().ok();
                    window.emit("global-shortcut-add-task", ()).ok();
                }
            }).expect("Failed to register Ctrl+Shift+A");
            
            let app_handle_theme = app.handle().clone();
            app.global_shortcut_manager().register("Ctrl+Shift+T", move || {
                if let Some(window) = app_handle_theme.get_window("main") {
                    window.emit("global-shortcut-toggle-theme", ()).ok();
                }
            }).expect("Failed to register Ctrl+Shift+T");
            
            let app_handle_open = app.handle().clone();
            app.global_shortcut_manager().register("Ctrl+Shift+O", move || {
                if let Some(window) = app_handle_open.get_window("main") {
                    window.show().ok();
                    window.set_focus().ok();
                }
            }).expect("Failed to register Ctrl+Shift+O");
            
            let app_handle_dashboard = app.handle().clone();
            app.global_shortcut_manager().register("Ctrl+Shift+D", move || {
                if let Some(window) = app_handle_dashboard.get_window("main") {
                    window.show().ok();
                    window.set_focus().ok();
                    window.emit("global-shortcut-dashboard", ()).ok();
                }
            }).expect("Failed to register Ctrl+Shift+D");
            
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
            commands::get_attachment,
            commands::get_attachment_path,
            commands::read_attachment_file_content,
            commands::open_attachment_file,
            commands::get_settings,
            commands::update_settings,
            commands::create_backup,
            commands::restore_backup,
            commands::export_data,
            commands::import_data,
            commands::show_notification,
            commands::get_autostart_enabled,
            commands::set_autostart_enabled,
            commands::get_completion_stats,
            commands::get_priority_distribution,
            commands::get_project_stats,
            commands::get_productivity_trend,
            commands::get_most_productive_day,
            commands::get_average_completion_time,
            commands::snooze_notification,
            commands::create_template,
            commands::get_templates,
            commands::get_template,
            commands::update_template,
            commands::delete_template,
            commands::create_task_from_template,
            commands::get_user_progress,
            commands::grant_xp,
            commands::update_streak,
            commands::check_streak_on_startup,
            commands::get_badges,
            commands::check_and_award_badges,
            commands::translate_task_content,
            commands::save_translation_override,
            commands::get_translation,
            commands::get_all_tags,
            commands::get_task_tags,
            commands::create_tag,
            commands::delete_tag,
            commands::add_tag_to_task,
            commands::remove_tag_from_task,
            commands::get_suggested_tags,
            commands::get_tasks_by_tag,
            commands::get_tasks_by_tags,
            commands::create_task_relationship,
            commands::delete_task_relationship,
            commands::get_related_tasks,
            commands::create_pomodoro_session,
            commands::get_pomodoro_stats,
            commands::get_daily_pomodoro_stats,
            commands::get_best_focus_times,
            commands::get_task_completion_rates,
            commands::get_pomodoro_streak,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
