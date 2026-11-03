import { useEffect, useState } from "react";
import "./App.css";
import { dictionaries, type Lang, type TextKey } from "./i18n";

type Page = "home" | "instances" | "mods" | "settings";
type Theme = "dark" | "light" | "amoled";

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
    // storage unavailable, use fallback
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

  const t = (key: TextKey) => dictionaries[lang][key];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("hwdp.theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("hwdp.lang", lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const menu: { id: Page; label: TextKey }[] = [
    { id: "home", label: "home" },
    { id: "instances", label: "instances" },
    { id: "mods", label: "mods" },
    { id: "settings", label: "settings" },
  ];

  const themes: Theme[] = ["dark", "light", "amoled"];

  return (
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
            <h1 className="mb-2 text-3xl font-bold">{t("welcome")}</h1>
            <p className="mb-6 text-muted">{t("welcomeText")}</p>
            <button
              disabled
              className="cursor-not-allowed rounded-lg bg-accent px-6 py-3 font-semibold text-white opacity-50"
            >
              {t("play")}
            </button>
          </div>
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
  );
}

export default App;