use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

pub fn copy_attachment_to_storage(
    app_handle: &tauri::AppHandle,
    source_path: &str,
    task_id: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    // Get app data directory
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data directory")?;
    
    // Create attachments directory
    let attachments_dir = app_data_dir.join("attachments");
    fs::create_dir_all(&attachments_dir)?;
    
    // Get file extension from source
    let source_path_buf = PathBuf::from(source_path);
    let extension = source_path_buf
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    // Generate unique filename
    let unique_id = Uuid::new_v4();
    let filename = if extension.is_empty() {
        format!("{}", unique_id)
    } else {
        format!("{}.{}", unique_id, extension)
    };
    
    // Create task-specific subdirectory
    let task_dir = attachments_dir.join(task_id);
    fs::create_dir_all(&task_dir)?;
    
    // Full destination path
    let dest_path = task_dir.join(&filename);
    
    // Copy file
    fs::copy(source_path, &dest_path)?;
    
    // Return relative path from app_data_dir
    let relative_path = dest_path
        .strip_prefix(&app_data_dir)
        .map_err(|_| "Failed to compute relative path")?
        .to_string_lossy()
        .to_string();
    
    Ok(relative_path)
}

