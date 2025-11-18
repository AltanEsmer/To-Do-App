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

pub fn validate_file_type(file_path: &str) -> Result<(), String> {
    let path = PathBuf::from(file_path);
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());
    
    let ext = extension.as_deref().unwrap_or("");
    
    // Allowed extensions: images, PDF, text, video, audio
    let allowed_extensions = [
        // Images
        "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico",
        // PDF
        "pdf",
        // Text
        "txt", "md",
        // Video
        "mp4", "webm", "mov",
        // Audio
        "mp3", "wav", "ogg",
    ];
    
    if allowed_extensions.contains(&ext) {
        Ok(())
    } else {
        Err(format!(
            "File type not allowed. Allowed types: images (png, jpg, jpeg, gif, webp, bmp, svg, ico), PDF, text (txt, md), video (mp4, webm, mov), audio (mp3, wav, ogg)"
        ))
    }
}

pub fn get_mime_type(file_path: &str) -> Option<String> {
    let path = PathBuf::from(file_path);
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());
    
    match extension.as_deref() {
        // Images
        Some("png") => Some("image/png".to_string()),
        Some("jpg") | Some("jpeg") => Some("image/jpeg".to_string()),
        Some("gif") => Some("image/gif".to_string()),
        Some("webp") => Some("image/webp".to_string()),
        Some("bmp") => Some("image/bmp".to_string()),
        Some("svg") => Some("image/svg+xml".to_string()),
        Some("ico") => Some("image/x-icon".to_string()),
        // PDF
        Some("pdf") => Some("application/pdf".to_string()),
        // Text
        Some("txt") => Some("text/plain".to_string()),
        Some("md") => Some("text/markdown".to_string()),
        // Video
        Some("mp4") => Some("video/mp4".to_string()),
        Some("webm") => Some("video/webm".to_string()),
        Some("mov") => Some("video/quicktime".to_string()),
        // Audio
        Some("mp3") => Some("audio/mpeg".to_string()),
        Some("wav") => Some("audio/wav".to_string()),
        Some("ogg") => Some("audio/ogg".to_string()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_file_type() {
        // Valid file types
        assert!(validate_file_type("test.png").is_ok());
        assert!(validate_file_type("test.jpg").is_ok());
        assert!(validate_file_type("test.jpeg").is_ok());
        assert!(validate_file_type("test.gif").is_ok());
        assert!(validate_file_type("test.webp").is_ok());
        assert!(validate_file_type("test.pdf").is_ok());
        assert!(validate_file_type("test.txt").is_ok());
        assert!(validate_file_type("test.md").is_ok());

        // Invalid file types
        assert!(validate_file_type("test.exe").is_err());
        assert!(validate_file_type("test.zip").is_err());
        assert!(validate_file_type("test").is_err());
    }

    #[test]
    fn test_get_mime_type() {
        assert_eq!(get_mime_type("test.png"), Some("image/png".to_string()));
        assert_eq!(get_mime_type("test.jpg"), Some("image/jpeg".to_string()));
        assert_eq!(get_mime_type("test.jpeg"), Some("image/jpeg".to_string()));
        assert_eq!(get_mime_type("test.gif"), Some("image/gif".to_string()));
        assert_eq!(get_mime_type("test.webp"), Some("image/webp".to_string()));
        assert_eq!(get_mime_type("test.pdf"), Some("application/pdf".to_string()));
        assert_eq!(get_mime_type("test.txt"), Some("text/plain".to_string()));
        assert_eq!(get_mime_type("test.md"), Some("text/markdown".to_string()));
        assert_eq!(get_mime_type("test.unknown"), None);
        assert_eq!(get_mime_type("test"), None);
    }
}

