use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}};

fn data_dir() -> Result<PathBuf, String> {
    let base = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(PathBuf::from))
        .ok_or_else(|| "Cannot locate the user data directory.".to_string())?;
    let dir = base.join("HWDP Launcher");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn safe_name(value: &str) -> Result<String, String> {
    let cleaned: String = value.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' )
        .take(48).collect();
    if cleaned.is_empty() { return Err("Profile name must contain letters or numbers.".into()); }
    Ok(cleaned)
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub game_version: String,
    pub loader: String,
    pub created_at: String,
}

fn profiles_file() -> Result<PathBuf, String> { Ok(data_dir()?.join("profiles.json")) }

fn read_profiles() -> Result<Vec<Profile>, String> {
    let path = profiles_file()?;
    if !path.exists() { return Ok(Vec::new()); }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| format!("Invalid profiles file: {e}"))
}

fn write_profiles(profiles: &[Profile]) -> Result<(), String> {
    let path = profiles_file()?;
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, serde_json::to_vec_pretty(profiles).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_profiles() -> Result<Vec<Profile>, String> { read_profiles() }

#[tauri::command]
pub fn create_profile(name: String, game_version: String, loader: String) -> Result<Profile, String> {
    let id = safe_name(&name)?;
    if game_version.trim().is_empty() || game_version.len() > 40 {
        return Err("Choose a valid Minecraft version.".into());
    }
    let loader = loader.to_ascii_lowercase();
    if !["vanilla", "fabric", "forge", "neoforge", "quilt"].contains(&loader.as_str()) {
        return Err("Unsupported mod loader.".into());
    }
    let mut profiles = read_profiles()?;
    if profiles.iter().any(|p| p.id.eq_ignore_ascii_case(&id)) {
        return Err("A profile with this name already exists.".into());
    }
    let profile = Profile {
        id, name: name.trim().to_string(), game_version, loader,
        created_at: format!("{:?}", std::time::SystemTime::now()),
    };
    profiles.push(profile.clone());
    write_profiles(&profiles)?;
    Ok(profile)
}

#[tauri::command]
pub fn delete_profile(profile_id: String) -> Result<(), String> {
    let id = safe_name(&profile_id)?;
    let mut profiles = read_profiles()?;
    let before = profiles.len();
    profiles.retain(|p| p.id != id);
    if profiles.len() == before { return Err("Profile not found.".into()); }
    write_profiles(&profiles)
}

#[tauri::command]
pub async fn microsoft_login(app: tauri::AppHandle) -> Result<String, String> {
    use crust_core::authenticator::Authenticator;
    use tauri::Emitter;
    let auth = Authenticator::new().map_err(|e| format!("Microsoft auth setup failed: {e}"))?;
    let flow = auth.device_code().await.map_err(|e| format!("Could not start Microsoft sign-in: {e}"))?;
    let verification_url = flow.verification_uri_complete();
    app.emit("microsoft-login-code", serde_json::json!({
        "verificationUrl": verification_url
    })).map_err(|e| e.to_string())?;
    let account = flow.wait().await.map_err(|e| format!("Microsoft sign-in failed: {e}"))?;
    let path = data_dir()?.join("account.json");
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, serde_json::to_vec(&account).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())?;
    Ok(account.name)
}

#[tauri::command]
pub fn microsoft_logout() -> Result<(), String> {
    let path = data_dir()?.join("account.json");
    if path.exists() { fs::remove_file(path).map_err(|e| e.to_string())?; }
    Ok(())
}

fn read_account() -> Result<crust_core::authenticator::Account, String> {
    let path = data_dir()?.join("account.json");
    let bytes = fs::read(path).map_err(|_| "Sign in with Microsoft before launching online.".to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| format!("Saved account is invalid: {e}"))
}

#[tauri::command]
pub async fn launch_profile(profile_id: String) -> Result<String, String> {
    use crust_core::launcher::{Launch, LaunchOptions, LoaderKind};

    let id = safe_name(&profile_id)?;
    let profile = read_profiles()?.into_iter().find(|p| p.id == id)
        .ok_or_else(|| "Profile not found.".to_string())?;
    // Online Microsoft authentication is required. Offline/developer identities
    // are intentionally not used to bypass Minecraft ownership checks.
    let account = read_account()?;

    let root = data_dir()?.join("game");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let mut options = LaunchOptions::new(&root, &profile.game_version);
    options.instance = Some(profile.id.clone());
    options.memory.max = "4G".to_string();
    options.download_concurrency = 8;
    match profile.loader.as_str() {
        "fabric" => { options.loader.kind = Some(LoaderKind::Fabric); options.loader.enable = true; }
        "forge" => { options.loader.kind = Some(LoaderKind::Forge); options.loader.enable = true; }
        "neoforge" => { options.loader.kind = Some(LoaderKind::NeoForge); options.loader.enable = true; }
        "quilt" => { options.loader.kind = Some(LoaderKind::Quilt); options.loader.enable = true; }
        _ => {}
    }
    let launch = Launch::new(options, account).map_err(|e| format!("Could not prepare Minecraft: {e}"))?;
    let mut child = launch.run().await.map_err(|e| format!("Minecraft install/launch failed: {e}"))?;
    child.wait().await.map_err(|e| format!("Minecraft process failed: {e}"))?;
    Ok(format!("Minecraft profile '{}' closed.", profile.name))
}

#[derive(Deserialize)]
struct MrVersion {
    files: Vec<MrFile>,
    #[serde(default)]
    dependencies: Vec<MrDependency>,
}
#[derive(Deserialize)]
struct MrFile {
    url: String,
    filename: String,
    primary: bool,
    hashes: Option<MrHashes>,
}
#[derive(Deserialize)]
struct MrHashes { sha1: Option<String> }
#[derive(Deserialize)]
struct MrDependency {
    version_id: Option<String>,
    dependency_type: String,
}

async fn download_modrinth_version(client: &reqwest::Client, version_id: &str, mods_dir: &Path) -> Result<String, String> {
    let endpoint = format!("https://api.modrinth.com/v2/version/{}", version_id);
    let version: MrVersion = client.get(endpoint).send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
    let file = version.files.iter().find(|f| f.primary).or_else(|| version.files.first())
        .ok_or_else(|| "This Modrinth version has no downloadable file.".to_string())?;
    let filename: String = file.filename.chars().filter(|c| c.is_ascii_alphanumeric() || "._-+".contains(*c)).take(160).collect();
    if !filename.to_ascii_lowercase().ends_with(".jar") { return Err("The selected project file is not a JAR mod.".into()); }
    let bytes = client.get(&file.url).send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?.bytes().await.map_err(|e| e.to_string())?;
    if let Some(expected) = file.hashes.as_ref().and_then(|h| h.sha1.as_ref()) {
        use sha1::{Digest, Sha1};
        let actual = format!("{:x}", Sha1::digest(&bytes));
        if !actual.eq_ignore_ascii_case(expected) { return Err(format!("SHA-1 verification failed for {filename}.")); }
    }
    fs::create_dir_all(mods_dir).map_err(|e| e.to_string())?;
    let path = mods_dir.join(&filename);
    fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    let mut installed = vec![filename];
    for dependency in version.dependencies.iter().filter(|d| d.dependency_type == "required") {
        if let Some(dep_id) = &dependency.version_id {
            let dep_endpoint = format!("https://api.modrinth.com/v2/version/{}", dep_id);
            let dep: MrVersion = client.get(dep_endpoint).send().await.map_err(|e| e.to_string())?
                .error_for_status().map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
            if let Some(dep_file) = dep.files.iter().find(|f| f.primary).or_else(|| dep.files.first()) {
                let dep_name: String = dep_file.filename.chars().filter(|c| c.is_ascii_alphanumeric() || "._-+".contains(*c)).take(160).collect();
                if dep_name.to_ascii_lowercase().ends_with(".jar") && !mods_dir.join(&dep_name).exists() {
                    let dep_bytes = client.get(&dep_file.url).send().await.map_err(|e| e.to_string())?
                        .error_for_status().map_err(|e| e.to_string())?.bytes().await.map_err(|e| e.to_string())?;
                    if let Some(expected) = dep_file.hashes.as_ref().and_then(|h| h.sha1.as_ref()) {
                        use sha1::{Digest, Sha1};
                        if !format!("{:x}", Sha1::digest(&dep_bytes)).eq_ignore_ascii_case(expected) {
                            return Err(format!("SHA-1 verification failed for dependency {dep_name}."));
                        }
                    }
                    fs::write(mods_dir.join(&dep_name), dep_bytes).map_err(|e| e.to_string())?;
                    installed.push(dep_name);
                }
            }
        }
    }
    Ok(installed.join(", "))
}

#[tauri::command]
pub async fn install_modrinth_version(profile_id: String, version_id: String) -> Result<String, String> {
    let id = safe_name(&profile_id)?;
    let profile = read_profiles()?.into_iter().find(|p| p.id == id).ok_or_else(|| "Profile not found.".to_string())?;
    let client = reqwest::Client::builder()
        .user_agent("ymuzyka11-code/HWDP-Launcher/0.2.0 (https://github.com/ymuzyka11-code/hwdp-launcher)")
        .build().map_err(|e| e.to_string())?;
    let mods_dir = data_dir()?.join("game").join("instances").join(&profile.id).join("mods");
    download_modrinth_version(&client, &version_id, &mods_dir).await
}

#[derive(Deserialize)]
struct CfEnvelope<T> { data: T }
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurseForgeProject {
    pub id: u64,
    pub name: String,
    pub summary: String,
    pub download_count: f64,
    pub logo: Option<CfLogo>,
}
#[derive(Deserialize, Serialize)]
pub struct CfLogo { pub url: Option<String> }

#[tauri::command]
pub async fn search_curseforge(api_key: String, query: String, game_version: Option<String>, mod_loader: Option<u32>) -> Result<Vec<CurseForgeProject>, String> {
    let key = api_key.trim();
    if key.len() < 20 || key.len() > 256 { return Err("Enter a valid CurseForge API key.".into()); }
    let client = reqwest::Client::new();
    let mut request = client.get("https://api.curseforge.com/v1/mods/search")
        .header("x-api-key", key)
        .query(&[("gameId", "432"), ("classId", "6"), ("searchFilter", query.as_str()), ("pageSize", "30")]);
    if let Some(version) = game_version { request = request.query(&[("gameVersion", version)]); }
    if let Some(loader) = mod_loader { request = request.query(&[("modLoaderType", loader.to_string())]); }
    let response: CfEnvelope<Vec<CurseForgeProject>> = request.send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| format!("CurseForge API error: {e}"))?
        .json().await.map_err(|e| e.to_string())?;
    Ok(response.data)
}

#[tauri::command]
pub async fn install_curseforge_file(api_key: String, profile_id: String, mod_id: u64, file_id: u64) -> Result<String, String> {
    let key = api_key.trim();
    if key.len() < 20 || key.len() > 256 { return Err("Enter a valid CurseForge API key.".into()); }
    let id = safe_name(&profile_id)?;
    let profile = read_profiles()?.into_iter().find(|p| p.id == id).ok_or_else(|| "Profile not found.".to_string())?;
    let client = reqwest::Client::new();
    let url = format!("https://api.curseforge.com/v1/mods/{mod_id}/files/{file_id}/download-url");
    let envelope: CfEnvelope<Option<String>> = client.get(url).header("x-api-key", key).send().await
        .map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let download_url = envelope.data.ok_or_else(|| "CurseForge did not provide a download URL for this file.".to_string())?;
    let response = client.get(download_url).send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let filename = format!("curseforge-{mod_id}-{file_id}.jar");
    let mods_dir = data_dir()?.join("game").join("instances").join(profile.id).join("mods");
    fs::create_dir_all(&mods_dir).map_err(|e| e.to_string())?;
    fs::write(mods_dir.join(&filename), bytes).map_err(|e| e.to_string())?;
    Ok(filename)
}

#[tauri::command]
pub fn get_microsoft_account_name() -> Result<Option<String>, String> {
    let path = data_dir()?.join("account.json");
    if !path.exists() { return Ok(None); }
    let account: serde_json::Value = serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(account.get("name").and_then(|v| v.as_str()).map(str::to_string))
}
