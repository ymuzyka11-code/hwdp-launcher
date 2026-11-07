
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import SkinStudio from "./SkinStudio";
import { dictionaries, type Lang, type TextKey } from "./i18n";

type Page = "home" | "instances" | "mods" | "settings" | "minecraft" | "skins";
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

  const t = (key: TextKey) => dictionaries[lang][key];

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
  { id: "skins", label: "skins" },
  { id: "settings", label: "settings" },
];

  const themes: Theme[] = ["dark", "light", "amoled"];

  function formatMemory(bytes: number) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }

  return (
    <>
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

      <div className="flex h-full">
        <aside className="flex w-56 flex-col gap-1 bg-panel p-4">
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

        <main className="flex-1 overflow-auto p-8">
          {page === "home" && (
            <div>
              <h1 className="mb-2 text-3xl font-bold">
                {t("welcome")}
              </h1>

              <p className="mb-6 text-muted">
                {t("welcomeText")}
              </p>

              <button
                disabled
                className="mb-8 cursor-not-allowed rounded-lg bg-accent px-6 py-3 font-semibold text-white opacity-50"
              >
                {t("play")}
              </button>

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
            <div>
              <h1 className="mb-2 text-3xl font-bold">{t("instances")}</h1>
              <p className="text-muted">{t("noInstances")}</p>
            </div>
          )}

          {page === "mods" && (
            <div>
              <h1 className="mb-2 text-3xl font-bold">{t("mods")}</h1>
              <p className="text-muted">{t("modsSoon")}</p>
            </div>
          )}

          {page === "skins" && <SkinStudio />}

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
