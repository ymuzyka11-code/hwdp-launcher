
use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::{CpuRefreshKind, System};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HardwareInfo {
    cpu_name: String,
    logical_cores: usize,
    physical_cores: Option<usize>,
    total_memory_bytes: u64,
    os_name: Option<String>,
    os_version: Option<String>,
    host_name: Option<String>,
    gpu_name: Option<String>,
}

#[cfg(target_os = "windows")]
fn detect_gpu() -> Option<String> {
    let output = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Get-CimInstance -ClassName Win32_VideoController | ForEach-Object { $_.Name }",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let result = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(", ");

    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}

#[cfg(not(target_os = "windows"))]
fn detect_gpu() -> Option<String> {
    None
}

#[tauri::command]
fn get_hardware_info() -> HardwareInfo {
    let mut system = System::new();

    system.refresh_cpu_list(CpuRefreshKind::everything());
    system.refresh_memory();

    let cpu_name = system
        .cpus()
        .first()
        .map(|cpu| cpu.brand().trim().to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Unknown CPU".to_string());

    HardwareInfo {
        cpu_name,
        logical_cores: system.cpus().len(),
        physical_cores: System::physical_core_count(),
        total_memory_bytes: system.total_memory(),
        os_name: System::name(),
        os_version: System::os_version(),
        host_name: System::host_name(),
        gpu_name: detect_gpu(),
    }
}

// Dane pobierane z oficjalnego manifestu Mojang.

#[derive(Deserialize)]
struct VersionManifest {
    versions: Vec<ManifestVersion>,
}

#[derive(Deserialize)]
struct ManifestVersion {
    id: String,

    #[serde(rename = "type")]
    version_type: String,

    #[serde(rename = "releaseTime")]
    release_time: String,

    url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MinecraftVersion {
    id: String,
    version_type: String,
    release_time: String,
    url: String,
}

#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct VersionDetails {
    id: String,
    main_class: String,
    downloads: VersionDownloads,
}

#[derive(Serialize, serde::Deserialize)]
struct VersionDownloads {
    client: ClientDownload,
}

#[derive(Serialize, serde::Deserialize)]
struct ClientDownload {
    url: String,
    sha1: String,
    size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadResult {
    version_id: String,
    file_path: String,
    file_size: u64,
    sha1_verified: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    version_id: String,
    downloaded: u64,
    total: u64,
    percentage: u8,
}

#[tauri::command]
async fn get_minecraft_versions() -> Result<Vec<MinecraftVersion>, String> {
    let response = reqwest::get(
        "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
    )
    .await
    .map_err(|error| format!("Connection error: {error}"))?;

    let manifest: VersionManifest = response
        .error_for_status()
        .map_err(|error| format!("Server error: {error}"))?
        .json()
        .await
        .map_err(|error| format!("Invalid manifest: {error}"))?;

    Ok(
        manifest
            .versions
            .into_iter()
            .map(|version| MinecraftVersion {
                id: version.id,
                version_type: version.version_type,
                release_time: version.release_time,
                url: version.url,
            })
            .collect()
    )
}

#[tauri::command]
async fn get_version_details(version_id: String) -> Result<VersionDetails, String> {
    let manifest_url =
        "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

    let manifest_response = reqwest::get(manifest_url)
        .await
        .map_err(|error| error.to_string())?;

    let manifest: VersionManifest = manifest_response
        .json()
        .await
        .map_err(|error| error.to_string())?;

    let version = manifest
        .versions
        .iter()
        .find(|version| version.id == version_id)
        .ok_or_else(|| "Nie znaleziono wybranej wersji.".to_string())?;

    let details_response = reqwest::get(&version.url)
        .await
        .map_err(|error| error.to_string())?;

    if !details_response.status().is_success() {
        return Err("Nie udało się pobrać metadanych wersji.".to_string());
    }

    let details: VersionDetails = details_response
        .json()
        .await
        .map_err(|error| error.to_string())?;

    Ok(details)
}

#[tauri::command]
async fn download_minecraft_client(
    app: tauri::AppHandle,
    version_id: String,
) -> Result<DownloadResult, String> {
    use sha1::{Digest, Sha1};
    use std::io::Write;
    use tauri::Emitter;

    let manifest_url =
        "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

    let manifest_response = reqwest::get(manifest_url)
        .await
        .map_err(|e| e.to_string())?;

    if !manifest_response.status().is_success() {
        return Err("Nie udało się pobrać manifestu.".to_string());
    }

    let manifest: VersionManifest = manifest_response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let version = manifest.versions
        .iter()
        .find(|v| v.id == version_id)
        .ok_or_else(|| "Nie znaleziono wersji.".to_string())?;

    let details_response = reqwest::get(&version.url)
        .await
        .map_err(|e| e.to_string())?;

    if !details_response.status().is_success() {
        return Err("Nie udało się pobrać metadanych.".to_string());
    }

    let details: VersionDetails = details_response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if !details.id.chars().all(|c| {
        c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-'
    }) {
        return Err("Nieprawidłowy identyfikator wersji.".to_string());
    }

    let total = details.downloads.client.size;

    let response = reqwest::get(&details.downloads.client.url)
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err("Nie udało się pobrać pliku Minecrafta.".to_string());
    }

    let app_data = std::env::var("APPDATA")
        .map_err(|_| "Nie znaleziono folderu AppData.".to_string())?;

    let version_dir = std::path::PathBuf::from(app_data)
        .join("HWDP Launcher")
        .join("versions")
        .join(&details.id);

    std::fs::create_dir_all(&version_dir)
        .map_err(|e| e.to_string())?;

    let file_path = version_dir.join("client.jar");
    let temporary_path = version_dir.join("client.jar.tmp");

    let mut file = std::fs::File::create(&temporary_path)
        .map_err(|e| e.to_string())?;

    let mut downloaded: u64 = 0;
    let mut hasher = Sha1::new();
    let mut response = response;

    let _ = app.emit(
        "minecraft-download-progress",
        DownloadProgress {
            version_id: details.id.clone(),
            downloaded: 0,
            total,
            percentage: 0,
        },
    );

    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).map_err(|e| e.to_string())?;

        hasher.update(&chunk);
        downloaded += chunk.len() as u64;

        let percentage = if total > 0 {
            ((downloaded.saturating_mul(100) / total).min(100)) as u8
        } else {
            0
        };

        let _ = app.emit(
            "minecraft-download-progress",
            DownloadProgress {
                version_id: details.id.clone(),
                downloaded,
                total,
                percentage,
            },
        );
    }

    file.flush().map_err(|e| e.to_string())?;
    drop(file);

    if downloaded != total {
        let _ = std::fs::remove_file(&temporary_path);
        return Err("Rozmiar pobranego pliku jest nieprawidłowy.".to_string());
    }

    let actual_sha1 = format!("{:x}", hasher.finalize());

    if actual_sha1 != details.downloads.client.sha1.to_lowercase() {
        let _ = std::fs::remove_file(&temporary_path);
        return Err("Weryfikacja SHA-1 nie powiodła się.".to_string());
    }

    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }

    std::fs::rename(&temporary_path, &file_path)
        .map_err(|e| e.to_string())?;

    let _ = app.emit(
        "minecraft-download-progress",
        DownloadProgress {
            version_id: details.id.clone(),
            downloaded,
            total,
            percentage: 100,
        },
    );

    Ok(DownloadResult {
        version_id: details.id,
        file_path: file_path.to_string_lossy().to_string(),
        file_size: downloaded,
        sha1_verified: true,
    })
}



#[derive(Deserialize)]
struct ModrinthSearchResponse {
    hits: Vec<ModrinthProject>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModrinthProject {
    project_id: String,
    slug: String,
    title: String,
    description: String,
    author: String,
    downloads: u64,
    icon_url: Option<String>,
    project_type: String,
}

#[tauri::command]
async fn search_modrinth_projects(query: String, game_version: Option<String>, loader: Option<String>) -> Result<Vec<ModrinthProject>, String> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    if query.len() > 120 {
        return Err("Search query is too long.".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent("HWDP-Launcher/0.1.0 (https://github.com/ymuzyka11-code/hwdp-launcher)")
        .build()
        .map_err(|e| e.to_string())?;

    let mut facets = vec![r#"["project_type:mod"]"#.to_string()];
    if let Some(version) = game_version.filter(|v| !v.is_empty()) {
        let escaped = version.replace('\\', "").replace('"', "");
        facets.push(format!(r#"["versions:{}"]"#, escaped));
    }
    if let Some(loader) = loader.filter(|v| !v.is_empty() && v != "vanilla") {
        let escaped = loader.replace('\\', "").replace('"', "");
        facets.push(format!(r#"["categories:{}"]"#, escaped));
    }

    let facets_json = format!("[{}]", facets.join(","));
    let response = client
        .get("https://api.modrinth.com/v2/search")
        .query(&[("query", query), ("limit", "30"), ("facets", facets_json.as_str())])
        .send()
        .await
        .map_err(|e| format!("Modrinth connection failed: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Modrinth API error: {e}"))?;

    let result: ModrinthSearchResponse = response.json().await
        .map_err(|e| format!("Invalid Modrinth response: {e}"))?;
    Ok(result.hits)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_hardware_info,
            get_minecraft_versions,
            get_version_details,
            download_minecraft_client,
            search_modrinth_projects
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}