use serde::{Deserialize, Serialize};
use serde_json::Value;
use sysinfo::{CpuRefreshKind, System};

const MOJANG_MANIFEST_URL: &str =
    "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

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
        // GPU detection is intentionally not guessed. Native DXGI detection
        // will replace this placeholder in a dedicated implementation.
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

async fn fetch_json(url: &str, label: &str) -> Result<Value, String> {
    reqwest::Client::builder()
        .user_agent(concat!("HWDP-Launcher/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|error| format!("Could not create HTTP client: {error}"))?
        .get(url)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|error| format!("{label} request failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("{label} returned an HTTP error: {error}"))?
        .json::<Value>()
        .await
        .map_err(|error| format!("{label} contains invalid JSON: {error}"))
}

#[tauri::command]
async fn get_minecraft_versions() -> Result<Vec<MinecraftVersion>, String> {
    let manifest_value = fetch_json(MOJANG_MANIFEST_URL, "Mojang version manifest").await?;
    let manifest: VersionManifest = serde_json::from_value(manifest_value)
        .map_err(|error| format!("Invalid Mojang version manifest: {error}"))?;

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

/// Fetch metadata only for a version ID present in Mojang's official manifest.
/// The frontend cannot supply an arbitrary URL to this command.
#[tauri::command]
async fn get_minecraft_version_details(version_id: String) -> Result<Value, String> {
    if version_id.is_empty()
        || version_id.len() > 64
        || !version_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "._-".contains(character))
    {
        return Err("Invalid Minecraft version identifier.".to_string());
    }

    let manifest_value = fetch_json(MOJANG_MANIFEST_URL, "Mojang version manifest").await?;
    let manifest: VersionManifest = serde_json::from_value(manifest_value)
        .map_err(|error| format!("Invalid Mojang version manifest: {error}"))?;

    let version = manifest
        .versions
        .into_iter()
        .find(|version| version.id == version_id)
        .ok_or_else(|| format!("Minecraft version '{version_id}' was not found in Mojang's manifest."))?;

    let details = fetch_json(&version.url, "Minecraft version metadata").await?;
    let returned_id = details
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| "Version metadata is missing its ID.".to_string())?;

    if returned_id != version_id {
        return Err("Mojang metadata ID does not match the requested version.".to_string());
    }

    Ok(details)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_hardware_info,
            get_minecraft_versions,
            get_minecraft_version_details
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
