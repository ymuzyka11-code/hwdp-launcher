export type Lang = "en" | "pl";

const en = {
  appName: "HWDP Launcher",
  home: "Home",
  instances: "Instances",
  mods: "Mods",
  settings: "Settings",
  play: "Play",
  welcome: "Welcome to HWDP Launcher",
  welcomeText: "Your Minecraft launcher. More features are coming soon.",
  noInstances: "You have no instances yet.",
  modsSoon: "The mod browser (Modrinth and CurseForge) is coming in stage 5.",
  language: "Language",
  theme: "Theme",
  dark: "Dark",
  light: "Light",
  amoled: "AMOLED",
};

const pl: Record<keyof typeof en, string> = {
  appName: "HWDP Launcher",
  home: "Start",
  instances: "Instancje",
  mods: "Mody",
  settings: "Ustawienia",
  play: "Graj",
  welcome: "Witaj w HWDP Launcher",
  welcomeText: "Twój launcher Minecrafta. Kolejne funkcje już wkrótce.",
  noInstances: "Nie masz jeszcze żadnych instancji.",
  modsSoon: "Przeglądarka modów (Modrinth i CurseForge) pojawi się w etapie 5.",
  language: "Język",
  theme: "Motyw",
  dark: "Ciemny",
  light: "Jasny",
  amoled: "AMOLED",
};

export const dictionaries = { en, pl };
export type TextKey = keyof typeof en;