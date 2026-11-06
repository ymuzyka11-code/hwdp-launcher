
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import Updater from "./Updater";
import "./App.css";
import { dictionaries, type Lang, type TextKey } from "./i18n";

type Page = "home" | "instances" | "mods" | "settings" | "minecraft";
type Theme = "dark" | "light" | "amoled";

type HardwareInfo = {
  cpuName: string;
  logicalCores: number;
  physicalCores: number | null;
  totalMemoryBytes: number;
  osName: string | null;
  osVersion: string | null;
  hostName: string | null;
  gpuName: string | null;
};

type ModrinthProject = { projectId: string; slug: string; title: string; description: string; author: string; downloads: number; iconUrl: string | null; projectType: string };
type Profile = { id: string; name: string; gameVersion: string; loader: string; createdAt: string };

type MinecraftVersion = {
  id: string;
  versionType: string;
  releaseTime: string;
  url: string;
};

function loadSetting<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(key);
    if (value && (allowed as readonly string[]).includes(value)) {
      return value as T;
    }
  } catch {
    // Storage unavailable.
  }
  return fallback;
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [lang, setLang] = useState<Lang>(() =>
    loadSetting<Lang>("hwdp.lang", ["en", "pl"], "en"),
  );
  const [theme, setTheme] = useState<Theme>(() =>
    loadSetting<Theme>("hwdp.theme", ["dark", "light", "amoled"], "dark"),
  );

  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [versionFilter, setVersionFilter] = useState<"release" | "snapshot">("release");
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionsError, setVersionsError] = useState("");
  const [modQuery, setModQuery] = useState("");
  const [modResults, setModResults] = useState<ModrinthProject[]>([]);
  const [modLoading, setModLoading] = useState(false);
  const [modError, setModError] = useState("");
  const [selectedModProfile, setSelectedModProfile] = useState("");
  const [selectedModLoader, setSelectedModLoader] = useState("fabric");
  const [installingProject, setInstallingProject] = useState<string | null>(null);
  const [installMessage, setInstallMessage] = useState("");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileVersion, setProfileVersion] = useState("1.21.1");
  const [profileLoader, setProfileLoader] = useState("vanilla");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [launchingProfile, setLaunchingProfile] = useState<string | null>(null);
  const [launchMessage, setLaunchMessage] = useState("");

  const t = (key: TextKey) => dictionaries[lang][key];

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    listen<{ verificationUrl: string }>("microsoft-login-code", async (event) => {
      try {
        await openUrl(event.payload.verificationUrl);
      } catch (error) {
        setLoginError("Could not open Microsoft sign-in page: " + String(error));
      }
    }).then((stop) => {
      if (cancelled) stop();
      else unlisten = stop;
    });
    return () => { cancelled = true; unlisten?.(); };
  }, []);

  useEffect(() => {
    void refreshAccountAndProfiles();
  }, []);

  async function refreshAccountAndProfiles() {
    try {
      const [name, list] = await Promise.all([
        invoke<string | null>("get_microsoft_account_name"),
        invoke<Profile[]>("list_profiles"),
      ]);
      setAccountName(name);
      setProfiles(list);
      setSelectedModProfile((current) => current || list[0]?.id || "");
      if (list[0] && list[0].loader !== "vanilla") setSelectedModLoader(list[0].loader);
    } catch (error) {
      setProfileError(String(error));
    }
  }

  async function signInMicrosoft() {
    setLoginBusy(true);
    setLoginError("");
    try {
      const name = await invoke<string>("microsoft_login");
      setAccountName(name);
    } catch (error) {
      setLoginError(String(error));
    } finally {
      setLoginBusy(false);
    }
  }

  async function signOutMicrosoft() {
    try {
      await invoke("microsoft_logout");
      setAccountName(null);
    } catch (error) {
      setLoginError(String(error));
    }
  }

  async function createProfile() {
    setProfileBusy(true);
    setProfileError("");
    try {
      const profile = await invoke<Profile>("create_profile", {
        name: profileName,
        gameVersion: profileVersion,
        loader: profileLoader,
      });
      setProfiles((current) => [...current, profile]);
      setSelectedModProfile(profile.id);
      if (profile.loader !== "vanilla") setSelectedModLoader(profile.loader);
      setProfileName("");
    } catch (error) {
      setProfileError(String(error));
    } finally {
      setProfileBusy(false);
    }
  }

  async function removeProfile(profileId: string) {
    try {
      await invoke("delete_profile", { profileId });
      setProfiles((current) => current.filter((profile) => profile.id !== profileId));
    } catch (error) {
      setProfileError(String(error));
    }
  }

  async function launchProfile(profileId: string) {
    setLaunchingProfile(profileId);
    setLaunchMessage("");
    setProfileError("");
    try {
      const result = await invoke<string>("launch_profile", { profileId });
      setLaunchMessage(result);
    } catch (error) {
      setProfileError(String(error));
    } finally {
      setLaunchingProfile(null);
    }
  }

  async function scanHardware() {
    setScanning(true);
    setScanError(false);

    try {
      const info = await invoke<HardwareInfo>("get_hardware_info");
      setHardware(info);
    } catch (error) {
      console.error("Hardware scan error:", error);
      setScanError(true);
    } finally {
      setScanning(false);
    }
  }

  async function searchMods() {
    const query = modQuery.trim();
    if (!query) {
      setModResults([]);
      setModError("");
      return;
    }
    const profile = profiles.find((item) => item.id === selectedModProfile);
    if (!profile) {
      setModError("Najpierw utwórz lub wybierz instancję Minecraft.");
      return;
    }
    setModLoading(true);
    setModError("");
    setInstallMessage("");
    try {
      const results = await invoke<ModrinthProject[]>("search_modrinth_projects", {
        query,
        gameVersion: profile.gameVersion,
        loader: selectedModLoader,
      });
      setModResults(results);
    } catch (error) {
      setModError(String(error));
      setModResults([]);
    } finally {
      setModLoading(false);
    }
  }

  async function installMod(projectId: string) {
    if (!selectedModProfile) {
      setModError("Wybierz instancję przed instalacją moda.");
      return;
    }
    setInstallingProject(projectId);
    setModError("");
    setInstallMessage("");
    try {
      const installed = await invoke<string>("install_modrinth_project", {
        profileId: selectedModProfile,
        projectId,
      });
      setInstallMessage("Zainstalowano: " + installed);
    } catch (error) {
      setModError(String(error));
    } finally {
      setInstallingProject(null);
    }
  }

  async function loadVersions() {
  setLoadingVersions(true);
  setVersionsError("");

  try {
    const data = await invoke<MinecraftVersion[]>(
      "get_minecraft_versions"
    );

    setVersions(data);

    const latestRelease = data.find(
      (version) => version.versionType === "release"
    );

    setSelectedVersion(
      latestRelease?.id ?? data[0]?.id ?? ""
    );
  } catch (error) {
    console.error("Minecraft versions error:", error);
    setVersionsError(String(error));
  } finally {
    setLoadingVersions(false);
  }
}

 useEffect(() => {
     if (page !== "minecraft" || versions.length > 0) {
     return;
    }

   void loadVersions();
  }, [page]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    try {
      localStorage.setItem("hwdp.theme", theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;

    try {
      localStorage.setItem("hwdp.lang", lang);
    } catch {
      // Ignore storage errors.
    }
  }, [lang]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const info = await Promise.all([
          invoke<HardwareInfo>("get_hardware_info"),
          new Promise<void>((resolve) => setTimeout(resolve, 1000)),
        ]);

        if (active) {
          setHardware(info[0]);
        }
      } catch (error) {
        console.error("Startup scan error:", error);
        if (active) setScanError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const menu: { id: Page; label: TextKey }[] = [
  { id: "home", label: "home" },
  { id: "minecraft", label: "minecraft" },
  { id: "instances", label: "instances" },
  { id: "mods", label: "mods" },
  { id: "settings", label: "settings" },
];

  const themes: Theme[] = ["dark", "light", "amoled"];

  function formatMemory(bytes: number) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }

  return (
    <>
      <Updater />
      {loading && (
        <div className="splash-screen">
          <div className="splash-logo">HWDP</div>
          <div className="splash-subtitle">LAUNCHER</div>
          <div className="loading-track">
            <div className="loading-progress" />
          </div>
          <p>{t("loading")}</p>
        </div>
      )}

      <div className="launcher-shell flex h-full">
        <aside className="launcher-sidebar flex w-56 flex-col gap-1 bg-panel p-4">
          <div className="mb-6 text-lg font-bold text-accent">
            {t("appName")}
          </div>

          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`rounded-lg px-3 py-2 text-left transition-colors ${
                page === item.id
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-bg hover:text-fg"
              }`}
            >
              {t(item.label)}
            </button>
          ))}
        </aside>

        <main className="launcher-main flex-1 overflow-auto p-8">
          {page === "home" && (
            <div>
              <h1 className="mb-2 text-3xl font-bold">
                {t("welcome")}
              </h1>

              <p className="mb-6 text-muted">
                {t("welcomeText")}
              </p>

              <button
                onClick={() => profiles[0] && void launchProfile(profiles[0].id)}
                disabled={!accountName || profiles.length === 0 || launchingProfile !== null}
                className="mb-8 rounded-lg bg-accent px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {launchingProfile ? "Uruchamianie Minecraft..." : t("play")}
              </button>
              {!accountName && <p className="mb-4 text-sm text-muted">Zaloguj się w zakładce Instancje, aby uruchomić grę.</p>}

              <section className="max-w-3xl">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold">
                    {t("hardware")}
                  </h2>

                  <button
                    onClick={scanHardware}
                    disabled={scanning}
                    className="rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-50"
                  >
                    {scanning ? t("scanning") : t("scan")}
                  </button>
                </div>

                {scanError && (
                  <p className="mb-4 text-red-400">
                    {t("scanError")}
                  </p>
                )}

                {hardware ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <HardwareCard
                      title={t("cpu")}
                      value={hardware.cpuName}
                      detail={`${hardware.logicalCores} ${t("logicalCores")} · ${
                        hardware.physicalCores ?? t("unavailable")
                      } ${t("physicalCores")}`}
                    />

                    <HardwareCard
                      title={t("gpu")}
                      value={hardware.gpuName ?? t("unavailable")}
                    />

                    <HardwareCard
                      title={t("ram")}
                      value={formatMemory(hardware.totalMemoryBytes)}
                    />

                    <HardwareCard
                      title={t("system")}
                      value={
                        [hardware.osName, hardware.osVersion]
                          .filter(Boolean)
                          .join(" ") || t("unavailable")
                      }
                    />

                    <HardwareCard
                      title={t("computer")}
                      value={hardware.hostName ?? t("unavailable")}
                    />
                  </div>
                ) : (
                  <p className="text-muted">
                    {scanning ? t("scanning") : t("unavailable")}
                  </p>
                )}
              </section>
            </div>
          )}

{page === "minecraft" && (
  <section className="max-w-3xl">
    <h1 className="mb-2 text-3xl font-bold">
      {t("minecraft")}
    </h1>

    <p className="mb-6 text-muted">
      {t("versionSelection")}
    </p>

    <div className="mb-5 flex flex-wrap gap-2">
      <button
        onClick={() => setVersionFilter("release")}
        className={`rounded-lg px-4 py-2 ${
          versionFilter === "release"
            ? "bg-accent text-white"
            : "bg-panel text-fg"
        }`}
      >
        {t("release")}
      </button>

      <button
        onClick={() => setVersionFilter("snapshot")}
        className={`rounded-lg px-4 py-2 ${
          versionFilter === "snapshot"
            ? "bg-accent text-white"
            : "bg-panel text-fg"
        }`}
      >
        {t("snapshot")}
      </button>

      <button
        onClick={loadVersions}
        disabled={loadingVersions}
        className="rounded-lg bg-panel px-4 py-2 text-fg disabled:opacity-50"
      >
        {loadingVersions
          ? t("loadingVersions")
          : t("refreshVersions")}
      </button>
    </div>

    {loadingVersions && (
      <p className="text-muted">{t("loadingVersions")}</p>
    )}

    {versionsError && (
      <p className="mb-4 text-red-400">
        {t("versionsError")} {versionsError}
      </p>
    )}

    {!loadingVersions && versions.length > 0 && (
      <>
        <label className="mb-2 block text-sm text-muted">
          {t("chooseVersion")}
        </label>

        <select
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value)}
          className="mb-5 w-full rounded-lg bg-panel px-4 py-3 text-fg"
        >
          {versions
            .filter((version) =>
              versionFilter === "release"
                ? version.versionType === "release"
                : version.versionType === "snapshot"
            )
            .slice(0, 50)
            .map((version) => (
              <option key={version.id} value={version.id}>
                {version.id}
              </option>
            ))}
        </select>

        <div className="rounded-xl border border-white/10 bg-panel p-5">
          <p className="mb-2 text-sm text-muted">
            {t("selectedVersion")}
          </p>

          <h2 className="text-2xl font-bold">
            Minecraft {selectedVersion || "—"}
          </h2>

          <p className="mt-2 text-sm text-muted">
            {t("releaseDate")}:{" "}
            {versions.find((v) => v.id === selectedVersion)
              ? new Date(
                  versions.find((v) => v.id === selectedVersion)!.releaseTime
                ).toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US")
              : "—"}
          </p>

          <div className="mt-5 rounded-lg bg-bg p-4 text-sm text-muted">
            {t("installComingSoon")}
          </div>
        </div>
      </>
    )}
  </section>
)}
          {page === "instances" && (
            <section className="max-w-4xl space-y-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold">{t("instances")}</h1>
                <p className="text-muted">Konta Microsoft i niezależne profile Minecraft.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-panel p-5">
                <h2 className="mb-3 text-lg font-semibold">Konto Microsoft</h2>
                {accountName ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-semibold">{accountName}</p><p className="text-xs text-muted">Konto połączone</p></div>
                    <button onClick={() => void signOutMicrosoft()} className="rounded-lg bg-bg px-4 py-2">Wyloguj</button>
                  </div>
                ) : (
                  <button onClick={() => void signInMicrosoft()} disabled={loginBusy} className="rounded-lg bg-accent px-5 py-3 font-semibold text-white disabled:opacity-50">
                    {loginBusy ? "Oczekiwanie na Microsoft..." : "Zaloguj przez Microsoft"}
                  </button>
                )}
                {loginError && <p className="mt-3 break-words text-sm text-red-400">{loginError}</p>}
              </div>
              <div className="rounded-xl border border-white/10 bg-panel p-5">
                <h2 className="mb-4 text-lg font-semibold">Utwórz profil</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Nazwa profilu" className="rounded-lg bg-bg px-3 py-3 text-fg" />
                  <input value={profileVersion} onChange={(e) => setProfileVersion(e.target.value)} placeholder="Wersja, np. 1.21.1" className="rounded-lg bg-bg px-3 py-3 text-fg" />
                  <select value={profileLoader} onChange={(e) => setProfileLoader(e.target.value)} className="rounded-lg bg-bg px-3 py-3 text-fg">
                    <option value="vanilla">Vanilla</option><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option><option value="quilt">Quilt</option>
                  </select>
                </div>
                <button onClick={() => void createProfile()} disabled={profileBusy || !profileName.trim() || !profileVersion.trim()} className="mt-3 rounded-lg bg-accent px-5 py-3 font-semibold text-white disabled:opacity-50">
                  {profileBusy ? "Tworzenie..." : "Utwórz profil"}
                </button>
              </div>
              {profileError && <p className="break-words text-sm text-red-400">{profileError}</p>}
              {launchMessage && <p className="text-sm text-green-400">{launchMessage}</p>}
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Twoje profile ({profiles.length})</h2>
                {profiles.length === 0 && <p className="text-sm text-muted">Nie masz jeszcze profili. Utwórz pierwszy powyżej.</p>}
                {profiles.map((profile) => (
                  <article key={profile.id} className="instance-card flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-panel p-4">
                    <div className="instance-identity"><span className="instance-mark">MC</span><div><h3 className="font-semibold">{profile.name}</h3><p className="text-sm text-muted">Minecraft {profile.gameVersion} · {profile.loader}</p><small>Profil lokalny · {new Date(profile.createdAt).toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US")}</small></div></div>
                    <div className="flex gap-2">
                      <button onClick={() => void launchProfile(profile.id)} disabled={!accountName || launchingProfile !== null} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50">{launchingProfile === profile.id ? "Uruchamianie..." : "Graj"}</button>
                      <button onClick={() => void removeProfile(profile.id)} className="rounded-lg bg-bg px-3 py-2 text-sm">Usuń</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === "mods" && (
            <section className="max-w-5xl">
              <h1 className="mb-2 text-3xl font-bold">{t("mods")}</h1>
              <p className="mb-6 text-muted">Wyszukuj mody Modrinth i instaluj zgodne wersje bezpośrednio w wybranej instancji.</p>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-muted">Instancja docelowa
                  <select value={selectedModProfile} onChange={(event) => {
                    const next = profiles.find((item) => item.id === event.target.value);
                    setSelectedModProfile(event.target.value);
                    if (next && next.loader !== "vanilla") setSelectedModLoader(next.loader);
                    setModResults([]);
                  }} className="mt-1 w-full rounded-lg bg-panel px-3 py-3 text-fg">
                    <option value="">Wybierz instancję</option>
                    {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.gameVersion} · {profile.loader}</option>)}
                  </select>
                </label>
                <label className="text-sm text-muted">Loader
                  <select value={selectedModLoader} disabled className="mt-1 w-full rounded-lg bg-panel px-3 py-3 text-fg disabled:opacity-80">
                    <option value="fabric">Fabric</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option><option value="quilt">Quilt</option>
                  </select>
                </label>
              </div>
              {!profiles.length && <p className="mb-4 text-sm text-amber-400">Najpierw utwórz instancję w zakładce Instancje.</p>}
              <form className="mb-6 flex gap-2" onSubmit={(event) => { event.preventDefault(); void searchMods(); }}>
                <input value={modQuery} onChange={(event) => setModQuery(event.target.value)} placeholder={t("searchMods")} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-panel px-4 py-3 text-fg" />
                <button type="submit" disabled={modLoading || !modQuery.trim()} className="rounded-lg bg-accent px-5 py-3 font-semibold text-white disabled:opacity-50">{modLoading ? t("searching") : t("search")}</button>
              </form>
              {modError && <p className="mb-4 break-words text-red-400">{modError}</p>}
              {installMessage && <p className="mb-4 text-sm text-green-400">{installMessage}</p>}
              {!modLoading && modResults.length === 0 && <p className="mb-5 text-sm text-muted">{t("modSearchHint")}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {modResults.map((mod) => (
                  <article key={mod.projectId} className="rounded-xl border border-white/10 bg-panel p-4">
                    <div className="flex items-start gap-3">
                      {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-bg" />}
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold">{mod.title}</h2>
                        <p className="text-xs text-muted">{t("by")} {mod.author} · {mod.downloads.toLocaleString()} {t("downloads")}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-muted">{mod.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button onClick={() => void installMod(mod.projectId)} disabled={!selectedModProfile || installingProject !== null} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {installingProject === mod.projectId ? "Instalowanie..." : "Zainstaluj w instancji"}
                      </button>
                      <a className="text-sm font-semibold text-accent hover:underline" href={`https://modrinth.com/mod/${encodeURIComponent(mod.slug)}`} target="_blank" rel="noreferrer">{t("openModrinth")}</a>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-8 rounded-xl border border-white/10 bg-panel p-5">
                <h2 className="font-semibold">CurseForge</h2>
                <p className="mt-2 text-sm text-muted">{t("curseForgeInfo")}</p>
                <a className="mt-3 inline-block text-sm font-semibold text-accent hover:underline" href="https://www.curseforge.com/minecraft/search" target="_blank" rel="noreferrer">{t("openCurseForge")}</a>
              </div>
            </section>
          )}

          {page === "settings" && (
            <div className="max-w-md">
              <h1 className="mb-6 text-3xl font-bold">{t("settings")}</h1>

              <div className="mb-6">
                <div className="mb-2 text-sm text-muted">{t("language")}</div>

                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="w-full rounded-lg bg-panel px-3 py-2 text-fg"
                >
                  <option value="en">English</option>
                  <option value="pl">Polski</option>
                </select>
              </div>

              <div>
                <div className="mb-2 text-sm text-muted">{t("theme")}</div>

                <div className="flex gap-2">
                  {themes.map((name) => (
                    <button
                      key={name}
                      onClick={() => setTheme(name)}
                      className={`rounded-lg px-4 py-2 ${
                        theme === name
                          ? "bg-accent text-white"
                          : "bg-panel text-fg hover:opacity-80"
                      }`}
                    >
                      {t(name)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function HardwareCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-5">
      <p className="mb-2 text-sm text-muted">{title}</p>
      <p className="break-words text-lg font-semibold">{value}</p>
      {detail && <p className="mt-2 text-sm text-muted">{detail}</p>}
    </div>
  );
}

export default App;
