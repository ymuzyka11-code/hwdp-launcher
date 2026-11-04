import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { dictionaries, type Lang, type TextKey } from "./i18n";

type Page = "home" | "minecraft" | "instances" | "mods" | "settings";
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

type MinecraftVersion = {
  id: string;
  versionType: string;
  releaseTime: string;
  url: string;
};

function loadSetting<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (value && (allowed as readonly string[]).includes(value)) return value as T;
  } catch {
    // Browser storage can be unavailable in restricted environments.
  }
  return fallback;
}

const pageMeta: Record<Page, { label: string; eyebrow: string }> = {
  home: { label: "home", eyebrow: "OVERVIEW" },
  minecraft: { label: "minecraft", eyebrow: "GAME LIBRARY" },
  instances: { label: "instances", eyebrow: "WORKSPACES" },
  mods: { label: "mods", eyebrow: "MOD CATALOG" },
  settings: { label: "settings", eyebrow: "PREFERENCES" },
};

function App() {
  const [page, setPage] = useState<Page>("home");
  const [lang, setLang] = useState<Lang>(() => loadSetting("hwdp.lang", ["en", "pl"], "pl"));
  const [theme, setTheme] = useState<Theme>(() => loadSetting("hwdp.theme", ["dark", "light", "amoled"], "dark"));
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [versionFilter, setVersionFilter] = useState<"release" | "snapshot">("release");
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionsError, setVersionsError] = useState("");

  const t = (key: TextKey) => dictionaries[lang][key];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("hwdp.theme", theme);
      localStorage.setItem("hwdp.lang", lang);
    } catch {
      // Preferences remain usable for this session.
    }
  }, [theme, lang]);

  async function scanHardware() {
    setScanning(true);
    setScanError("");
    try {
      setHardware(await invoke<HardwareInfo>("get_hardware_info"));
    } catch (error) {
      console.error("Hardware scan failed:", error);
      setScanError(String(error));
    } finally {
      setScanning(false);
    }
  }

  async function loadVersions() {
    setLoadingVersions(true);
    setVersionsError("");
    try {
      const result = await invoke<MinecraftVersion[]>("get_minecraft_versions");
      setVersions(result);
      const latest = result.find((item) => item.versionType === "release");
      setSelectedVersion((current) => current || latest?.id || result[0]?.id || "");
    } catch (error) {
      console.error("Minecraft version manifest failed:", error);
      setVersionsError(String(error));
    } finally {
      setLoadingVersions(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    invoke<HardwareInfo>("get_hardware_info")
      .then((result) => { if (mounted) setHardware(result); })
      .catch((error) => { if (mounted) setScanError(String(error)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (page === "minecraft" && versions.length === 0 && !loadingVersions) void loadVersions();
  }, [page]);

  const visibleVersions = useMemo(
    () => versions.filter((item) => item.versionType === versionFilter).slice(0, 100),
    [versions, versionFilter],
  );

  const navigation: Page[] = ["home", "minecraft", "instances", "mods", "settings"];

  function formatMemory(bytes: number) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }

  return (
    <div className="app-shell">
      {loading && <div className="boot-screen"><div className="brand-mark">H</div><strong>HWDP LAUNCHER</strong><span>Preparing your workspace</span><div className="boot-line"><i /></div></div>}
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">H</div>
          <div><strong>HWDP</strong><span>LAUNCHER</span></div>
        </div>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav className="navigation" aria-label="Main navigation">
          {navigation.map((item, index) => (
            <button key={item} className={`nav-item ${page === item ? "active" : ""}`} onClick={() => setPage(item)}>
              <span className="nav-symbol">{["⌂", "▣", "▤", "✣", "⚙"][index]}</span>
              <span>{t(item)}</span>
              {page === item && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-indicator"><span />{t("localReady")}</div>
          <div className="version-label">HWDP Launcher <span>v0.1.0 · DEV</span></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>HWDP</span><b>/</b>{t(page)}</div>
          <div className="topbar-actions">
            <span className="status-chip"><i />{t("earlyAccess")}</span>
            <button className="icon-button" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "amoled" : "dark")}>◐</button>
            <select className="language-select" value={lang} onChange={(event) => setLang(event.target.value as Lang)} aria-label={t("language")}>
              <option value="pl">PL</option><option value="en">EN</option>
            </select>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow">{pageMeta[page].eyebrow}</div><h1>{t(page)}</h1></div>
            {page === "home" && <div className="build-tag">BUILD 0.1.0</div>}
          </div>

          {page === "home" && (
            <>
              <section className="hero-card">
                <div className="hero-copy"><div className="hero-kicker">{t("launcherEnvironment")}</div><h2>{t("welcome")}</h2><p>{t("welcomeText")}</p><button className="primary-button" onClick={() => setPage("minecraft")}>{t("browseVersions")} <span>→</span></button></div>
                <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-cube"><span>HW</span><span>DP</span></div></div>
                <div className="hero-glow" />
              </section>
              <section className="section-block">
                <div className="section-heading"><div><div className="eyebrow">{t("systemOverview")}</div><h2>{t("hardware")}</h2></div><button className="secondary-button" onClick={scanHardware} disabled={scanning}>{scanning ? t("scanning") : "↻  " + t("scan")}</button></div>
                {scanError && <div className="inline-alert">{t("scanError")} <span>{scanError}</span></div>}
                <div className="hardware-grid">
                  <HardwareCard label={t("cpu")} value={hardware?.cpuName ?? (loading ? t("scanning") : t("unavailable"))} detail={hardware ? `${hardware.logicalCores} ${t("logicalCores")} · ${hardware.physicalCores ?? "—"} ${t("physicalCores")}` : ""} symbol="⌘" />
                  <HardwareCard label={t("gpu")} value={hardware?.gpuName ?? t("gpuPending")} detail={t("gpuPendingDetail")} symbol="▧" />
                  <HardwareCard label={t("ram")} value={hardware ? formatMemory(hardware.totalMemoryBytes) : "—"} detail={t("detectedMemory")} symbol="▤" />
                  <HardwareCard label={t("system")} value={hardware ? [hardware.osName, hardware.osVersion].filter(Boolean).join(" ") : "—"} detail={hardware?.hostName ?? ""} symbol="⌗" />
                </div>
              </section>
            </>
          )}

          {page === "minecraft" && <section className="content-card"><div className="section-heading"><div><div className="eyebrow">{t("officialManifest")}</div><h2>{t("versionSelection")}</h2><p>{t("versionDescription")}</p></div><button className="secondary-button" onClick={loadVersions} disabled={loadingVersions}>↻ {t("refreshVersions")}</button></div><div className="segmented-control"><button className={versionFilter === "release" ? "selected" : ""} onClick={() => setVersionFilter("release")}>{t("release")}</button><button className={versionFilter === "snapshot" ? "selected" : ""} onClick={() => setVersionFilter("snapshot")}>{t("snapshot")}</button></div>{loadingVersions && <p className="muted-message">{t("loadingVersions")}</p>}{versionsError && <div className="inline-alert">{t("versionsError")} {versionsError}</div>}{!loadingVersions && visibleVersions.length > 0 && <><label className="field-label" htmlFor="version-select">{t("chooseVersion")}</label><select id="version-select" className="version-select" value={selectedVersion} onChange={(event) => setSelectedVersion(event.target.value)}>{visibleVersions.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select><div className="selected-version"><div><span>{t("selectedVersion")}</span><strong>Minecraft {selectedVersion}</strong><small>{t("releaseDate")}: {new Date(versions.find((item) => item.id === selectedVersion)?.releaseTime ?? "").toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US")}</small></div><span className="planned-label">{t("installerPlanned")}</span></div><p className="notice-text">{t("installComingSoon")}</p></>}</section>}

          {page === "instances" && <section className="empty-state"><div className="empty-icon">▣</div><h2>{t("instances")}</h2><p>{t("noInstances")}</p><span className="planned-label">{t("plannedFeature")}</span></section>}
          {page === "mods" && <section className="empty-state"><div className="empty-icon">✣</div><h2>{t("mods")}</h2><p>{t("modsSoon")}</p><span className="planned-label">{t("plannedFeature")}</span></section>}
          {page === "settings" && <section className="content-card settings-card"><div className="eyebrow">{t("preferences")}</div><h2>{t("settings")}</h2><div className="setting-row"><div><strong>{t("language")}</strong><span>{t("languageDescription")}</span></div><select className="language-select large" value={lang} onChange={(event) => setLang(event.target.value as Lang)}><option value="pl">Polski</option><option value="en">English</option></select></div><div className="setting-row"><div><strong>{t("theme")}</strong><span>{t("themeDescription")}</span></div><select className="language-select large" value={theme} onChange={(event) => setTheme(event.target.value as Theme)}><option value="dark">Dark</option><option value="light">Light</option><option value="amoled">AMOLED</option></select></div><div className="setting-row"><div><strong>{t("appVersion")}</strong><span>0.1.0 · Early development</span></div></div></section>}
          <footer className="page-footer"><span>© 2026 HWDP Launcher</span><span>{t("notAffiliated")}</span></footer>
        </div>
      </main>
    </div>
  );
}

function HardwareCard({ label, value, detail, symbol }: { label: string; value: string; detail: string; symbol: string }) {
  return <article className="hardware-card"><div className="hardware-card-top"><span>{label}</span><i>{symbol}</i></div><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

export default App;
