import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export default function Updater() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    async function checkForUpdates() {
      try {
        const update = await check();
        if (!active || !update) return;
        setStatus(`Dostępna aktualizacja HWDP Launcher ${update.version}`);
        const accepted = window.confirm(
          `Dostępna jest nowa wersja HWDP Launcher (${update.version}). Zainstalować ją teraz?`
        );
        if (!accepted || !active) {
          setStatus("");
          return;
        }
        setStatus("Pobieranie i instalowanie aktualizacji...");
        await update.downloadAndInstall();
        if (active) await relaunch();
      } catch (error) {
        console.error("Updater error:", error);
        if (active) setStatus("Nie udało się sprawdzić lub zainstalować aktualizacji.");
      }
    }
    void checkForUpdates();
    return () => { active = false; };
  }, []);

  if (!status) return null;
  return (
    <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-white/10 bg-panel px-4 py-3 text-sm text-fg shadow-xl">
      {status}
    </div>
  );
}
