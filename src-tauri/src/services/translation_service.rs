use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
struct GoogleTranslateResponse {
    data: GoogleTranslateData,
}

#[derive(Debug, Serialize, Deserialize)]
struct GoogleTranslateData {
    translations: Vec<GoogleTranslation>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GoogleTranslation {
    translated_text: String,
    detected_source_language: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GoogleDetectResponse {
    data: GoogleDetectData,
}

#[derive(Debug, Serialize, Deserialize)]
struct GoogleDetectData {
    detections: Vec<Vec<GoogleDetection>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GoogleDetection {
    language: String,
    confidence: f64,
    is_reliable: bool,
}

// LibreTranslate API structures
#[derive(Debug, Serialize, Deserialize)]
struct LibreTranslateRequest {
    q: String,
    source: String,
    target: String,
    format: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct LibreTranslateResponse {
    translated_text: String,
}

// Helper function to get current timestamp
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

// Get API key from environment variable or settings (optional - returns None if not found)
pub fn get_api_key(conn: &rusqlite::Connection) -> Result<Option<String>, String> {
    // First try environment variable
    if let Ok(api_key) = std::env::var("GOOGLE_TRANSLATE_API_KEY") {
        if !api_key.is_empty() {
            return Ok(Some(api_key));
        }
    }
    
    // Fallback to settings table
    let api_key: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT value FROM settings WHERE key = 'google_translate_api_key'",
        [],
        |row| row.get(0),
    );
    
    match api_key {
        Ok(key) if !key.is_empty() => Ok(Some(key)),
        _ => Ok(None), // No API key - will use free LibreTranslate
    }
}

// Hash text for cache key
pub fn hash_text(text: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(text.as_bytes());
    format!("{:x}", hasher.finalize())
}

// Detect language - uses Google Translate if API key available, otherwise simple heuristic
pub async fn detect_language(text: &str, api_key: Option<&str>) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok("en".to_string());
    }
    
    // If API key is available, use Google Translate detection
    if let Some(key) = api_key {
        let url = format!(
            "https://translation.googleapis.com/language/translate/v2/detect?key={}",
            key
        );
        
        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .form(&[("q", text)])
            .send()
            .await
            .map_err(|e| format!("Failed to detect language: {}", e))?;
        
        let status = response.status();
        if status.is_success() {
            if let Ok(detect_response) = response.json::<GoogleDetectResponse>().await {
                if let Some(detections) = detect_response.data.detections.first() {
                    if let Some(detection) = detections.first() {
                        return Ok(detection.language.clone());
                    }
                }
            }
        }
    }
    
    // Fallback: Simple heuristic detection for common languages
    // Check for Turkish characters
    if text.chars().any(|c| matches!(c, 'ç' | 'ğ' | 'ı' | 'ö' | 'ş' | 'ü' | 'Ç' | 'Ğ' | 'İ' | 'Ö' | 'Ş' | 'Ü')) {
        return Ok("tr".to_string());
    }
    
    // Default to English
    Ok("en".to_string())
}

// Translate text using LibreTranslate (free, no API key required)
pub async fn translate_text_libre(
    text: &str,
    source_lang: &str,
    target_lang: &str,
) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok(text.to_string());
    }
    
    // Use public LibreTranslate instance (no API key required)
    let url = "https://translate.argosopentech.com/translate";
    
    let client = reqwest::Client::new();
    let request_body = LibreTranslateRequest {
        q: text.to_string(),
        source: source_lang.to_string(),
        target: target_lang.to_string(),
        format: "text".to_string(),
    };
    
    let response = client
        .post(url)
        .json(&request_body)
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to translate: {}", e))?;
    
    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Translation failed ({}): {}", status, error_text));
    }
    
    let translate_response: LibreTranslateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse translation response: {}", e))?;
    
    Ok(translate_response.translated_text)
}

// Translate text using Google Translate API (if API key available)
pub async fn translate_text_google(
    text: &str,
    source_lang: &str,
    target_lang: &str,
    api_key: &str,
) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok(text.to_string());
    }
    
    let url = format!(
        "https://translation.googleapis.com/language/translate/v2?key={}",
        api_key
    );
    
    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .form(&[
            ("q", text),
            ("source", source_lang),
            ("target", target_lang),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to translate: {}", e))?;
    
    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Translation failed ({}): {}", status, error_text));
    }
    
    let translate_response: GoogleTranslateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse translation response: {}", e))?;
    
    if let Some(translation) = translate_response.data.translations.first() {
        Ok(translation.translated_text.clone())
    } else {
        Err("No translation returned".to_string())
    }
}

// Get cached translation
pub fn get_cached_translation(
    conn: &rusqlite::Connection,
    source_text_hash: &str,
    source_lang: &str,
    target_lang: &str,
    field_type: &str,
) -> Result<Option<String>, String> {
    let result: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT translated_text FROM translations WHERE source_text_hash = ?1 AND source_lang = ?2 AND target_lang = ?3 AND field_type = ?4",
        params![source_text_hash, source_lang, target_lang, field_type],
        |row| row.get(0),
    );
    
    match result {
        Ok(text) => Ok(Some(text)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

// Save translation to cache
pub fn save_translation(
    conn: &rusqlite::Connection,
    source_text: &str,
    source_lang: &str,
    target_lang: &str,
    translated_text: &str,
    field_type: &str,
    task_id: Option<&str>,
    is_user_edited: bool,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let source_text_hash = hash_text(source_text);
    let now = now();
    
    conn.execute(
        "INSERT OR REPLACE INTO translations (id, source_text_hash, source_text, source_lang, target_lang, translated_text, field_type, task_id, is_user_edited, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            source_text_hash,
            source_text,
            source_lang,
            target_lang,
            translated_text,
            field_type,
            task_id,
            if is_user_edited { 1 } else { 0 },
            now,
            now
        ],
    )
    .map_err(|e| format!("Failed to save translation: {}", e))?;
    
    Ok(())
}

// Get user-edited translation for a specific task
pub fn get_user_translation(
    conn: &rusqlite::Connection,
    task_id: &str,
    field_type: &str,
    target_lang: &str,
) -> Result<Option<String>, String> {
    let result: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT translated_text FROM translations WHERE task_id = ?1 AND field_type = ?2 AND target_lang = ?3 AND is_user_edited = 1",
        params![task_id, field_type, target_lang],
        |row| row.get(0),
    );
    
    match result {
        Ok(text) => Ok(Some(text)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

// Helper function to check cache and get user translation (synchronous, no await)
pub fn check_cache_and_user_translation(
    conn: &rusqlite::Connection,
    text: &str,
    target_lang: &str,
    field_type: &str,
    task_id: Option<&str>,
) -> Result<Option<String>, String> {
    if text.trim().is_empty() {
        return Ok(Some(text.to_string()));
    }
    
    // Check for user-edited translation first (if task_id provided)
    if let Some(tid) = task_id {
        if let Ok(Some(user_translation)) = get_user_translation(conn, tid, field_type, target_lang) {
            return Ok(Some(user_translation));
        }
    }
    
    Ok(None)
}

// Main translation function that handles API calls (no connection needed)
// This function does NOT handle caching - that must be done by the caller
// Uses Google Translate if API key is provided, otherwise falls back to LibreTranslate (free)
pub async fn translate_text(
    text: &str,
    target_lang: &str,
    api_key: Option<&str>,
) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok(text.to_string());
    }
    
    // Detect source language
    let source_lang = detect_language(text, api_key).await?;
    
    // If source and target are the same, return original text
    if source_lang == target_lang {
        return Ok(text.to_string());
    }
    
    // Translate via API - use Google if API key available, otherwise LibreTranslate
    let translated = if let Some(key) = api_key {
        // Try Google Translate first
        match translate_text_google(text, &source_lang, target_lang, key).await {
            Ok(result) => result,
            Err(_) => {
                // Fallback to LibreTranslate if Google fails
                translate_text_libre(text, &source_lang, target_lang).await?
            }
        }
    } else {
        // Use free LibreTranslate
        translate_text_libre(text, &source_lang, target_lang).await?
    };
    
    Ok(translated)
}

