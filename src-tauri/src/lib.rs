use serde::{Deserialize, Serialize};
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
        // GPU detection is intentionally not guessed. A native Windows DXGI
        // implementation will replace this placeholder in a dedicated step.
        gpu_name: None,
    }
}

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

#[tauri::command]
async fn get_minecraft_versions() -> Result<Vec<MinecraftVersion>, String> {
    let response = reqwest::get(
        "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
    )
    .await
    .map_err(|error| format!("Connection error: {error}"))?
    .error_for_status()
    .map_err(|error| format!("Mojang manifest error: {error}"))?;

    let manifest: VersionManifest = response
        .json()
        .await
        .map_err(|error| format!("Invalid Mojang manifest: {error}"))?;

    Ok(manifest
        .versions
        .into_iter()
        .map(|version| MinecraftVersion {
            id: version.id,
            version_type: version.version_type,
            release_time: version.release_time,
            url: version.url,
        })
        .collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_hardware_info,
            get_minecraft_versions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
