use chrono::Utc;
use mc_launcher_core::{
    auth::microsoft_account,
    prelude::{
        Account, InstallRequest, JavaInstallPolicy, LaunchOptions, Launcher, LoaderSpec,
        LoaderVersion,
    },
    runtime::{get_executable_path, get_version_runtime_information, install_jvm_runtime},
    types::CallbackDict,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha512};
use std::{
    collections::HashMap,
    fs,
    io::{Read, Write},
    net::TcpListener,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Mutex, OnceLock},
    time::Duration,
};
use tauri::Manager;
use url::Url;

static HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
static ACCOUNT: OnceLock<Mutex<Option<StoredAuth>>> = OnceLock::new();
static LOGIN_STATE: OnceLock<Mutex<AuthState>> = OnceLock::new();

fn http_client() -> Result<&'static reqwest::Client, String> {
    if let Some(client) = HTTP_CLIENT.get() {
        return Ok(client);
    }
    let client = reqwest::Client::builder()
        .user_agent(concat!(
            "TheSocialNetwork35/FrostWalker/",
            env!("CARGO_PKG_VERSION")
        ))
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|error| format!("Netzwerk konnte nicht vorbereitet werden: {error}"))?;
    let _ = HTTP_CLIENT.set(client);
    HTTP_CLIENT
        .get()
        .ok_or_else(|| "Netzwerk konnte nicht initialisiert werden".to_string())
}

fn account_store() -> &'static Mutex<Option<StoredAuth>> {
    ACCOUNT.get_or_init(|| Mutex::new(None))
}

fn login_store() -> &'static Mutex<AuthState> {
    LOGIN_STATE.get_or_init(|| Mutex::new(AuthState::default()))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all(serialize = "camelCase"))]
struct ModrinthProject {
    project_id: String,
    slug: String,
    title: String,
    description: String,
    author: String,
    icon_url: Option<String>,
    downloads: u64,
    categories: Vec<String>,
    latest_version: Option<String>,
    license: String,
    #[serde(default)]
    gallery: Vec<String>,
    featured_gallery: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ModrinthApiResponse {
    hits: Vec<ModrinthProject>,
    total_hits: u64,
    offset: u64,
    limit: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModrinthSearchResult {
    hits: Vec<ModrinthProject>,
    total_hits: u64,
    offset: u64,
    limit: u64,
    elapsed_ms: u128,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ModrinthFile {
    url: String,
    filename: String,
    primary: bool,
    size: u64,
    hashes: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ModrinthVersion {
    id: String,
    project_id: String,
    name: String,
    version_number: String,
    version_type: String,
    date_published: String,
    downloads: u64,
    game_versions: Vec<String>,
    loaders: Vec<String>,
    files: Vec<ModrinthFile>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeStatus {
    app_version: String,
    platform: String,
    architecture: String,
    data_directory: String,
    microsoft_client_configured: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProfileProject {
    project_id: String,
    title: String,
    slug: String,
    #[serde(default)]
    version_id: Option<String>,
    #[serde(default)]
    version_number: Option<String>,
    #[serde(default)]
    filename: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProfileManifest {
    minecraft_version: String,
    loader: String,
    projects: Vec<ProfileProject>,
}

impl Default for ProfileManifest {
    fn default() -> Self {
        Self {
            minecraft_version: "1.21.11".into(),
            loader: "fabric".into(),
            projects: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct InstanceManifest {
    id: String,
    name: String,
    minecraft_version: String,
    loader: String,
    version_id: Option<String>,
    installed_at: Option<String>,
}

impl Default for InstanceManifest {
    fn default() -> Self {
        Self {
            id: "balanced".into(),
            name: "FrostWalker Balanced".into(),
            minecraft_version: "1.21.11".into(),
            loader: "fabric".into(),
            version_id: None,
            installed_at: None,
        }
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct InstanceSummary {
    id: String,
    name: String,
    minecraft_version: String,
    loader: String,
    version_id: Option<String>,
    installed_at: Option<String>,
    installed: bool,
    mods_count: usize,
    path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StoredAuth {
    id: String,
    name: String,
    access_token: String,
    refresh_token: String,
}

#[derive(Debug, Deserialize)]
struct MinecraftServiceToken {
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct MinecraftServiceProfile {
    id: String,
    name: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct MicrosoftProfile {
    id: String,
    name: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AuthState {
    status: String,
    profile: Option<MicrosoftProfile>,
    error: Option<String>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            status: "signedOut".into(),
            profile: None,
            error: None,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LoginStart {
    login_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LaunchResult {
    pid: u32,
    instance_path: String,
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("Datenordner ist nicht verfügbar: {error}"))
}

fn profile_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("profiles").join("balanced.json"))
}

fn instance_manifest_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("instances").join("balanced.json"))
}

fn instance_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("instances").join("balanced"))
}

fn auth_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("auth").join("microsoft.json"))
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, String> {
    let contents = fs::read_to_string(path)
        .map_err(|error| format!("{} konnte nicht gelesen werden: {error}", path.display()))?;
    serde_json::from_str(&contents)
        .map_err(|error| format!("{} ist beschädigt: {error}", path.display()))
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Speicherpfad ist ungültig".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Ordner konnte nicht erstellt werden: {error}"))?;
    let serialized = serde_json::to_string_pretty(value)
        .map_err(|error| format!("Daten konnten nicht serialisiert werden: {error}"))?;
    fs::write(path, serialized)
        .map_err(|error| format!("Daten konnten nicht gespeichert werden: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

fn load_profile_file(app: &tauri::AppHandle) -> Result<ProfileManifest, String> {
    let path = profile_path(app)?;
    if path.exists() {
        read_json(&path)
    } else {
        Ok(ProfileManifest::default())
    }
}

fn save_profile_file(app: &tauri::AppHandle, manifest: &ProfileManifest) -> Result<(), String> {
    write_json(&profile_path(app)?, manifest)
}

fn load_instance_file(app: &tauri::AppHandle) -> Result<InstanceManifest, String> {
    let path = instance_manifest_path(app)?;
    if path.exists() {
        read_json(&path)
    } else {
        Ok(InstanceManifest::default())
    }
}

fn save_instance_file(app: &tauri::AppHandle, manifest: &InstanceManifest) -> Result<(), String> {
    write_json(&instance_manifest_path(app)?, manifest)
}

fn client_id() -> Result<&'static str, String> {
    option_env!("FROSTWALKER_MICROSOFT_CLIENT_ID")
        .filter(|value| !value.trim().is_empty())
        .or(Some("6a993ee9-a1e3-4df4-9f2a-c344e1eca6c4"))
        .ok_or_else(|| "Microsoft Client-ID ist im Build noch nicht konfiguriert".to_string())
}

#[tauri::command]
async fn search_modrinth(
    query: String,
    limit: Option<u8>,
    offset: Option<u32>,
    index: Option<String>,
) -> Result<ModrinthSearchResult, String> {
    let started = std::time::Instant::now();
    let facets = r#"[["project_type:mod"],["categories:fabric"],["versions:1.21.11"]]"#;
    let requested_limit = limit.unwrap_or(24).clamp(1, 100).to_string();
    let requested_offset = offset.unwrap_or(0).to_string();
    let requested_index = index.unwrap_or_else(|| {
        if query.trim().is_empty() {
            "downloads".into()
        } else {
            "relevance".into()
        }
    });
    let index = match requested_index.as_str() {
        "relevance" | "downloads" | "follows" | "newest" | "updated" => requested_index,
        _ => "relevance".into(),
    };
    let response = http_client()?
        .get("https://api.modrinth.com/v2/search")
        .query(&[
            ("query", query.trim()),
            ("facets", facets),
            ("index", index.as_str()),
            ("limit", requested_limit.as_str()),
            ("offset", requested_offset.as_str()),
        ])
        .send()
        .await
        .map_err(|error| format!("Modrinth ist gerade nicht erreichbar: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Modrinth antwortet mit Status {}",
            response.status()
        ));
    }
    let result: ModrinthApiResponse = response
        .json()
        .await
        .map_err(|error| format!("Modrinth-Antwort konnte nicht gelesen werden: {error}"))?;
    Ok(ModrinthSearchResult {
        hits: result.hits,
        total_hits: result.total_hits,
        offset: result.offset,
        limit: result.limit,
        elapsed_ms: started.elapsed().as_millis(),
    })
}

#[tauri::command]
async fn list_project_versions(project_id: String) -> Result<Vec<ModrinthVersion>, String> {
    let url = format!("https://api.modrinth.com/v2/project/{project_id}/version");
    let response = http_client()?
        .get(url)
        .query(&[
            ("loaders", r#"["fabric"]"#),
            ("game_versions", r#"["1.21.11"]"#),
            ("include_changelog", "false"),
        ])
        .send()
        .await
        .map_err(|error| format!("Versionen konnten nicht geladen werden: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Modrinth antwortet mit Status {}",
            response.status()
        ));
    }
    response
        .json()
        .await
        .map_err(|error| format!("Versionsliste konnte nicht gelesen werden: {error}"))
}

#[tauri::command]
fn runtime_status(app: tauri::AppHandle) -> Result<RuntimeStatus, String> {
    Ok(RuntimeStatus {
        app_version: env!("CARGO_PKG_VERSION").into(),
        platform: std::env::consts::OS.into(),
        architecture: std::env::consts::ARCH.into(),
        data_directory: app_data_dir(&app)?.display().to_string(),
        microsoft_client_configured: client_id().is_ok(),
    })
}

#[tauri::command]
fn get_profile(app: tauri::AppHandle) -> Result<ProfileManifest, String> {
    load_profile_file(&app)
}

#[tauri::command]
fn add_project_to_profile(
    app: tauri::AppHandle,
    project_id: String,
    title: String,
    slug: String,
) -> Result<ProfileManifest, String> {
    let mut manifest = load_profile_file(&app)?;
    if manifest
        .projects
        .iter()
        .all(|project| project.project_id != project_id)
    {
        manifest.projects.push(ProfileProject {
            project_id,
            title,
            slug,
            version_id: None,
            version_number: None,
            filename: None,
        });
    }
    save_profile_file(&app, &manifest)?;
    Ok(manifest)
}

#[tauri::command]
fn remove_project_from_profile(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<ProfileManifest, String> {
    let mut manifest = load_profile_file(&app)?;
    let filename = manifest
        .projects
        .iter()
        .find(|project| project.project_id == project_id)
        .and_then(|project| project.filename.clone());
    manifest
        .projects
        .retain(|project| project.project_id != project_id);
    if let Some(filename) = filename {
        let _ = fs::remove_file(instance_dir(&app)?.join("game").join("mods").join(filename));
    }
    save_profile_file(&app, &manifest)?;
    Ok(manifest)
}

#[tauri::command]
async fn install_project_version(
    app: tauri::AppHandle,
    project_id: String,
    title: String,
    slug: String,
    version: ModrinthVersion,
) -> Result<ProfileManifest, String> {
    let file = version
        .files
        .iter()
        .find(|file| file.primary)
        .or_else(|| version.files.first())
        .cloned()
        .ok_or_else(|| "Diese Version enthält keine installierbare Datei".to_string())?;
    let download_url = Url::parse(&file.url)
        .map_err(|error| format!("Modrinth liefert eine ungültige Download-Adresse: {error}"))?;
    if download_url.scheme() != "https" {
        return Err("Unsicherer Mod-Download wurde blockiert".to_string());
    }
    let bytes = http_client()?
        .get(download_url)
        .send()
        .await
        .map_err(|error| format!("Mod konnte nicht geladen werden: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Modrinth-Download wurde abgelehnt: {error}"))?
        .bytes()
        .await
        .map_err(|error| format!("Mod-Datei konnte nicht gelesen werden: {error}"))?;
    if bytes.len() as u64 != file.size {
        return Err("Mod-Datei ist unvollständig und wurde nicht installiert".to_string());
    }
    if let Some(expected) = file.hashes.get("sha512") {
        let actual = hex::encode(Sha512::digest(&bytes));
        if !actual.eq_ignore_ascii_case(expected) {
            return Err("Mod-Datei hat die Modrinth-Prüfsumme nicht bestanden".to_string());
        }
    }
    let mods_dir = instance_dir(&app)?.join("game").join("mods");
    fs::create_dir_all(&mods_dir)
        .map_err(|error| format!("Mods-Ordner konnte nicht erstellt werden: {error}"))?;
    let destination = mods_dir.join(&file.filename);
    fs::write(&destination, bytes)
        .map_err(|error| format!("Mod konnte nicht gespeichert werden: {error}"))?;
    let mut manifest = load_profile_file(&app)?;
    if let Some(existing) = manifest
        .projects
        .iter_mut()
        .find(|project| project.project_id == project_id)
    {
        if let Some(old) = existing
            .filename
            .as_ref()
            .filter(|old| *old != &file.filename)
        {
            let _ = fs::remove_file(mods_dir.join(old));
        }
        existing.title = title;
        existing.slug = slug;
        existing.version_id = Some(version.id);
        existing.version_number = Some(version.version_number);
        existing.filename = Some(file.filename);
    } else {
        manifest.projects.push(ProfileProject {
            project_id,
            title,
            slug,
            version_id: Some(version.id),
            version_number: Some(version.version_number),
            filename: Some(file.filename),
        });
    }
    save_profile_file(&app, &manifest)?;
    Ok(manifest)
}

fn instance_summary(app: &tauri::AppHandle) -> Result<InstanceSummary, String> {
    let manifest = load_instance_file(app)?;
    let path = instance_dir(app)?;
    let mods_count = fs::read_dir(path.join("game").join("mods"))
        .map(|entries| entries.filter_map(Result::ok).count())
        .unwrap_or(0);
    Ok(InstanceSummary {
        id: manifest.id,
        name: manifest.name,
        minecraft_version: manifest.minecraft_version,
        loader: manifest.loader,
        version_id: manifest.version_id.clone(),
        installed_at: manifest.installed_at,
        installed: manifest.version_id.is_some(),
        mods_count,
        path: path.display().to_string(),
    })
}

#[tauri::command]
fn list_instances(app: tauri::AppHandle) -> Result<Vec<InstanceSummary>, String> {
    Ok(vec![instance_summary(&app)?])
}

fn prepare_instance_sync(app: &tauri::AppHandle) -> Result<InstanceSummary, String> {
    let mut instance = load_instance_file(app)?;
    let root = instance_dir(app)?;
    fs::create_dir_all(root.join("game").join("mods"))
        .map_err(|error| format!("Instanzordner konnte nicht erstellt werden: {error}"))?;
    let launcher = Launcher::new(root.join("minecraft"));
    let install = launcher
        .install(InstallRequest {
            minecraft_version: instance.minecraft_version.clone(),
            loader: Some(LoaderSpec::Fabric {
                version: LoaderVersion::LatestStable,
            }),
            java: JavaInstallPolicy::Auto,
        })
        .map_err(|error| format!("Minecraft konnte nicht vorbereitet werden: {error}"))?;
    let runtime =
        get_version_runtime_information(&instance.minecraft_version, launcher.minecraft_dir())
            .ok_or_else(|| "Minecraft nennt keine passende Java-Laufzeit".to_string())?;
    if get_executable_path(&runtime.name, launcher.minecraft_dir()).is_none() {
        install_jvm_runtime(
            &runtime.name,
            launcher.minecraft_dir(),
            &CallbackDict {
                set_status: None,
                set_progress: None,
                set_max: None,
            },
        )
        .map_err(|error| {
            format!(
                "Java {} konnte nicht installiert werden: {error}",
                runtime.java_major_version
            )
        })?;
    }
    instance.version_id = Some(install.version_id);
    instance.installed_at = Some(Utc::now().to_rfc3339());
    save_instance_file(app, &instance)?;
    instance_summary(app)
}

#[tauri::command]
async fn prepare_instance(app: tauri::AppHandle) -> Result<InstanceSummary, String> {
    tauri::async_runtime::spawn_blocking(move || prepare_instance_sync(&app))
        .await
        .map_err(|error| format!("Installationsprozess ist abgebrochen: {error}"))?
}

#[tauri::command]
fn begin_microsoft_login(app: tauri::AppHandle) -> Result<LoginStart, String> {
    let client_id = client_id()?.to_string();
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|error| {
        format!("Lokaler Login-Empfänger konnte nicht gestartet werden: {error}")
    })?;
    let redirect_uri = format!(
        "http://localhost:{}",
        listener
            .local_addr()
            .map_err(|error| error.to_string())?
            .port()
    );
    let (login_url, expected_state, verifier) =
        microsoft_account::get_secure_login_data(&client_id, &redirect_uri, None);
    *login_store()
        .lock()
        .map_err(|_| "Loginstatus ist gesperrt".to_string())? = AuthState {
        status: "waiting".into(),
        profile: None,
        error: None,
    };
    std::thread::spawn(move || {
        let result = complete_browser_login(
            listener,
            &client_id,
            &redirect_uri,
            &expected_state,
            &verifier,
        );
        match result {
            Ok(auth) => {
                let profile = MicrosoftProfile {
                    id: auth.id.clone(),
                    name: auth.name.clone(),
                };
                let save_result = auth_path(&app).and_then(|path| write_json(&path, &auth));
                if let Err(error) = save_result {
                    if let Ok(mut state) = login_store().lock() {
                        *state = AuthState {
                            status: "error".into(),
                            profile: None,
                            error: Some(format!(
                                "Microsoft-Anmeldung war erfolgreich, konnte aber nicht sicher gespeichert werden: {error}"
                            )),
                        };
                    }
                    return;
                }
                if let Ok(mut account) = account_store().lock() {
                    *account = Some(auth);
                }
                if let Ok(mut state) = login_store().lock() {
                    *state = AuthState {
                        status: "signedIn".into(),
                        profile: Some(profile),
                        error: None,
                    };
                }
            }
            Err(error) => {
                if let Ok(mut state) = login_store().lock() {
                    *state = AuthState {
                        status: "error".into(),
                        profile: None,
                        error: Some(error),
                    };
                }
            }
        }
    });
    Ok(LoginStart { login_url })
}

fn complete_browser_login(
    listener: TcpListener,
    client_id: &str,
    redirect_uri: &str,
    expected_state: &str,
    verifier: &str,
) -> Result<StoredAuth, String> {
    listener
        .set_nonblocking(false)
        .map_err(|error| error.to_string())?;
    let (mut stream, _) = listener
        .accept()
        .map_err(|error| format!("Login-Antwort konnte nicht empfangen werden: {error}"))?;
    let mut buffer = [0_u8; 16_384];
    let read = stream
        .read(&mut buffer)
        .map_err(|error| format!("Login-Antwort konnte nicht gelesen werden: {error}"))?;
    let request = String::from_utf8_lossy(&buffer[..read]);
    let path = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .ok_or_else(|| "Microsoft hat keine gültige Login-Antwort gesendet".to_string())?;
    let callback = Url::parse(&format!("{redirect_uri}{path}"))
        .map_err(|error| format!("Login-Antwort ist ungültig: {error}"))?;
    let params: std::collections::HashMap<String, String> =
        callback.query_pairs().into_owned().collect();
    if params.get("state").map(String::as_str) != Some(expected_state) {
        return Err("Sicherheitsprüfung des Microsoft-Logins ist fehlgeschlagen".into());
    }
    if let Some(error) = params.get("error_description") {
        return Err(error.clone());
    }
    let code = params
        .get("code")
        .ok_or_else(|| "Microsoft hat keinen Autorisierungscode zurückgegeben".to_string())?;
    let page = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<!doctype html><meta charset=utf-8><title>FrostWalker</title><style>body{font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f4f4f0;color:#111}main{text-align:center;padding:40px;max-width:520px}b{font-size:28px}p{color:#666;line-height:1.6}</style><main><b>Microsoft-Anmeldung abgeschlossen.</b><p>FrostWalker prüft jetzt noch Xbox und deine Minecraft-Lizenz. Du kannst dieses Fenster schließen und zum Launcher zurückkehren.</p></main>";
    let _ = stream.write_all(page.as_bytes());
    let oauth = microsoft_account::get_authorization_token(
        client_id,
        None,
        redirect_uri,
        code,
        Some(verifier),
    )
    .map_err(|error| format!("Microsoft-Token konnte nicht gelesen werden: {error}"))?;
    finish_minecraft_login(&oauth.access_token, oauth.refresh_token)
}

fn minecraft_service_error(status: reqwest::StatusCode, body: &str) -> String {
    let detail = serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|value| {
            value
                .get("errorMessage")
                .or_else(|| value.get("error"))
                .and_then(|message| message.as_str())
                .map(str::to_string)
        })
        .unwrap_or_else(|| format!("HTTP {status}"));
    if status == reqwest::StatusCode::FORBIDDEN
        && detail
            .to_ascii_lowercase()
            .contains("invalid app registration")
    {
        return "Microsoft-Anmeldung und Zwei-Faktor-Prüfung waren erfolgreich. Die neue FrostWalker-App-ID ist bei Minecraft Services aber noch nicht freigeschaltet (HTTP 403: Invalid app registration). Dafür ist eine zusätzliche Freigabe durch das Xbox-/Microsoft-Entwicklerprogramm erforderlich.".into();
    }
    format!("Minecraft Services antwortet mit {status}: {detail}")
}

fn finish_minecraft_login(
    microsoft_access_token: &str,
    refresh_token: String,
) -> Result<StoredAuth, String> {
    let xbl = microsoft_account::authenticate_with_xbl(microsoft_access_token)
        .map_err(|error| format!("Xbox-Live-Anmeldung fehlgeschlagen: {error}"))?;
    let user_hash = xbl
        .display_claims
        .xui
        .first()
        .map(|claim| claim.uhs.as_str())
        .ok_or_else(|| "Xbox Live hat keine Benutzerkennung zurückgegeben".to_string())?;
    let xsts = microsoft_account::authenticate_with_xsts(&xbl.token)
        .map_err(|error| format!("Xbox-Sicherheitsprüfung fehlgeschlagen: {error}"))?;
    let client = reqwest::blocking::Client::builder()
        .user_agent(concat!("FrostWalker/", env!("CARGO_PKG_VERSION")))
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|error| {
            format!("Minecraft-Verbindung konnte nicht vorbereitet werden: {error}")
        })?;
    let response = client
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .json(&serde_json::json!({
            "identityToken": format!("XBL3.0 x={user_hash};{}", xsts.token)
        }))
        .send()
        .map_err(|error| format!("Minecraft Services ist nicht erreichbar: {error}"))?;
    let status = response.status();
    let body = response
        .text()
        .map_err(|error| format!("Minecraft-Antwort konnte nicht gelesen werden: {error}"))?;
    if !status.is_success() {
        return Err(minecraft_service_error(status, &body));
    }
    let minecraft_token: MinecraftServiceToken = serde_json::from_str(&body)
        .map_err(|error| format!("Minecraft-Token hat ein unbekanntes Format: {error}"))?;
    let profile_response = client
        .get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(&minecraft_token.access_token)
        .send()
        .map_err(|error| format!("Minecraft-Profil ist nicht erreichbar: {error}"))?;
    let profile_status = profile_response.status();
    let profile_body = profile_response
        .text()
        .map_err(|error| format!("Minecraft-Profil konnte nicht gelesen werden: {error}"))?;
    if !profile_status.is_success() {
        if profile_status == reqwest::StatusCode::NOT_FOUND {
            return Err("Dieses Microsoft-Konto besitzt kein Minecraft-Java-Profil".into());
        }
        return Err(minecraft_service_error(profile_status, &profile_body));
    }
    let profile: MinecraftServiceProfile = serde_json::from_str(&profile_body)
        .map_err(|error| format!("Minecraft-Profil hat ein unbekanntes Format: {error}"))?;
    Ok(StoredAuth {
        id: profile.id,
        name: profile.name,
        access_token: minecraft_token.access_token,
        refresh_token,
    })
}

#[tauri::command]
fn microsoft_login_status() -> Result<AuthState, String> {
    login_store()
        .lock()
        .map(|state| state.clone())
        .map_err(|_| "Loginstatus ist gesperrt".to_string())
}

#[tauri::command]
async fn restore_microsoft_account(app: tauri::AppHandle) -> Result<AuthState, String> {
    if let Some(account) = account_store()
        .lock()
        .map_err(|_| "Kontostatus ist gesperrt".to_string())?
        .clone()
    {
        return Ok(AuthState {
            status: "signedIn".into(),
            profile: Some(MicrosoftProfile {
                id: account.id,
                name: account.name,
            }),
            error: None,
        });
    }
    let path = auth_path(&app)?;
    if !path.exists() {
        return Ok(AuthState::default());
    }
    let saved: StoredAuth = read_json(&path)?;
    let client_id = client_id()?.to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let refreshed =
            microsoft_account::refresh_authorization_token(&client_id, None, &saved.refresh_token)
                .map_err(|error| {
                    format!("Microsoft-Sitzung konnte nicht erneuert werden: {error}")
                })?;
        let auth = finish_minecraft_login(&refreshed.access_token, refreshed.refresh_token)?;
        write_json(&auth_path(&app)?, &auth)?;
        let profile = MicrosoftProfile {
            id: auth.id.clone(),
            name: auth.name.clone(),
        };
        *account_store()
            .lock()
            .map_err(|_| "Kontostatus ist gesperrt".to_string())? = Some(auth);
        let state = AuthState {
            status: "signedIn".into(),
            profile: Some(profile),
            error: None,
        };
        *login_store()
            .lock()
            .map_err(|_| "Loginstatus ist gesperrt".to_string())? = state.clone();
        Ok(state)
    })
    .await
    .map_err(|error| format!("Kontoprozess ist abgebrochen: {error}"))?
}

#[tauri::command]
fn logout_microsoft(app: tauri::AppHandle) -> Result<AuthState, String> {
    *account_store()
        .lock()
        .map_err(|_| "Kontostatus ist gesperrt".to_string())? = None;
    let path = auth_path(&app)?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("Anmeldedaten konnten nicht entfernt werden: {error}"))?;
    }
    let state = AuthState::default();
    *login_store()
        .lock()
        .map_err(|_| "Loginstatus ist gesperrt".to_string())? = state.clone();
    Ok(state)
}

#[tauri::command]
async fn launch_minecraft(app: tauri::AppHandle) -> Result<LaunchResult, String> {
    let account = account_store()
        .lock()
        .map_err(|_| "Kontostatus ist gesperrt".to_string())?
        .clone()
        .ok_or_else(|| "Bitte zuerst mit Microsoft anmelden".to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let summary = prepare_instance_sync(&app)?;
        let root = instance_dir(&app)?;
        let minecraft_dir = root.join("minecraft");
        let launcher = Launcher::new(&minecraft_dir);
        let version_id = summary
            .version_id
            .clone()
            .ok_or_else(|| "Instanz wurde nicht vollständig installiert".to_string())?;
        let version = launcher
            .load_version(&version_id)
            .map_err(|error| format!("Minecraft-Profil konnte nicht geladen werden: {error}"))?;
        let runtime = get_version_runtime_information(&summary.minecraft_version, &minecraft_dir)
            .ok_or_else(|| "Java-Laufzeit konnte nicht bestimmt werden".to_string())?;
        let java = get_executable_path(&runtime.name, &minecraft_dir)
            .ok_or_else(|| "Java-Laufzeit wurde nicht gefunden".to_string())?;
        let command = launcher
            .build_launch_command_from_version(
                &version,
                LaunchOptions {
                    account: Account::Microsoft {
                        username: account.name,
                        uuid: account.id,
                        access_token: account.access_token,
                    },
                    java_executable: Some(java),
                    game_directory: Some(root.join("game")),
                    launcher_name: "FrostWalker".into(),
                    launcher_version: env!("CARGO_PKG_VERSION").into(),
                    custom_resolution: Some((1280, 720)),
                    ..Default::default()
                },
            )
            .map_err(|error| format!("Startbefehl konnte nicht erstellt werden: {error}"))?;
        fs::create_dir_all(root.join("logs"))
            .map_err(|error| format!("Logordner konnte nicht erstellt werden: {error}"))?;
        let stdout = fs::File::create(root.join("logs").join("latest.log"))
            .map_err(|error| format!("Logdatei konnte nicht erstellt werden: {error}"))?;
        let stderr = stdout
            .try_clone()
            .map_err(|error| format!("Logdatei konnte nicht geöffnet werden: {error}"))?;
        let mut process = Command::new(&command.executable);
        process
            .args(&command.args)
            .current_dir(&command.working_dir)
            .stdout(Stdio::from(stdout))
            .stderr(Stdio::from(stderr));
        for (key, value) in command.env {
            process.env(key, value);
        }
        let child = process
            .spawn()
            .map_err(|error| format!("Minecraft konnte nicht gestartet werden: {error}"))?;
        Ok(LaunchResult {
            pid: child.id(),
            instance_path: root.display().to_string(),
        })
    })
    .await
    .map_err(|error| format!("Startprozess ist abgebrochen: {error}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            search_modrinth,
            list_project_versions,
            runtime_status,
            get_profile,
            add_project_to_profile,
            remove_project_from_profile,
            install_project_version,
            list_instances,
            prepare_instance,
            begin_microsoft_login,
            microsoft_login_status,
            restore_microsoft_account,
            logout_microsoft,
            launch_minecraft
        ])
        .run(tauri::generate_context!())
        .expect("error while running FrostWalker");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn modrinth_search_returns_compatible_projects() {
        let result = tauri::async_runtime::block_on(search_modrinth(
            "sodium".into(),
            Some(3),
            Some(0),
            Some("relevance".into()),
        ))
        .expect("Modrinth search should succeed");
        assert!(!result.hits.is_empty());
        assert!(result.hits.len() <= 3);
        assert!(result.total_hits > 0);
    }
}
