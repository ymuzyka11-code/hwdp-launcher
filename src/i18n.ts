export type Lang = "en" | "pl";

const en = {
  appName:"HWDP Launcher",home:"Overview",minecraft:"Minecraft",instances:"Instances",mods:"Mods",settings:"Settings",
  play:"Play",welcome:"Your Minecraft setup, under control.",welcomeText:"A focused desktop launcher built for clean game management. The foundation is in place; core game services are being developed.",
  noInstances:"Your game instances will appear here once instance management is implemented.",modsSoon:"The Modrinth and CurseForge browser is planned. Mod installation is not available yet.",
  language:"Language",theme:"Appearance",dark:"Dark",light:"Light",amoled:"AMOLED",hardware:"Hardware overview",scan:"Scan again",scanning:"Scanning…",
  cpu:"Processor",gpu:"Graphics adapter",ram:"Installed memory",logicalCores:"threads",physicalCores:"cores",system:"Operating system",computer:"Device",
  unavailable:"Not available",scanError:"Hardware scan failed.",loading:"Preparing workspace…",versionSelection:"Choose a game version",chooseVersion:"Minecraft version",
  release:"Releases",snapshot:"Snapshots",refreshVersions:"Refresh",loadingVersions:"Loading official version list…",versionsError:"Could not load Minecraft versions.",
  selectedVersion:"Selected version",installComingSoon:"The complete installer is not available yet. This selector currently reads Mojang's official version manifest only.",
  releaseDate:"Published",launcherEnvironment:"A BETTER WAY TO MANAGE MINECRAFT",browseVersions:"Explore versions",systemOverview:"YOUR DEVICE",
  officialManifest:"MOJANG VERSION MANIFEST",versionDescription:"Browse versions published by Mojang. Selecting a version does not install or launch the game.",
  installerPlanned:"INSTALLER IN DEVELOPMENT",plannedFeature:"PLANNED",gpuPending:"Detection not implemented",gpuPendingDetail:"Native GPU detection is being developed.",
  detectedMemory:"Detected by the system",localReady:"Desktop environment ready",earlyAccess:"EARLY DEVELOPMENT",preferences:"PERSONALIZE YOUR WORKSPACE",
  languageDescription:"Choose the interface language.",themeDescription:"Choose the color scheme.",appVersion:"Application version",
  notAffiliated:"Not affiliated with Mojang or Microsoft."
};

const pl: Record<keyof typeof en, string> = {
  appName:"HWDP Launcher",home:"Przegląd",minecraft:"Minecraft",instances:"Instancje",mods:"Mody",settings:"Ustawienia",
  play:"Graj",welcome:"Minecraft pod pełną kontrolą.",welcomeText:"Przejrzysty launcher do zarządzania grą. Fundament aplikacji już powstał, a główne usługi gry są w trakcie tworzenia.",
  noInstances:"Instancje pojawią się tutaj po wdrożeniu ich obsługi.",modsSoon:"Przeglądarka Modrinth i CurseForge jest w planach. Instalowanie modów nie jest jeszcze dostępne.",
  language:"Język",theme:"Wygląd",dark:"Ciemny",light:"Jasny",amoled:"AMOLED",hardware:"Informacje o sprzęcie",scan:"Skanuj ponownie",scanning:"Skanowanie…",
  cpu:"Procesor",gpu:"Karta graficzna",ram:"Pamięć RAM",logicalCores:"wątków",physicalCores:"rdzeni",system:"System operacyjny",computer:"Urządzenie",
  unavailable:"Niedostępne",scanError:"Skanowanie sprzętu nie powiodło się.",loading:"Przygotowywanie aplikacji…",versionSelection:"Wybierz wersję gry",
  chooseVersion:"Wersja Minecrafta",release:"Wydania",snapshot:"Snapshoty",refreshVersions:"Odśwież",loadingVersions:"Pobieranie oficjalnej listy wersji…",
  versionsError:"Nie udało się pobrać listy wersji Minecrafta.",selectedVersion:"Wybrana wersja",
  installComingSoon:"Pełny instalator nie jest jeszcze dostępny. Ten selektor odczytuje obecnie wyłącznie oficjalny manifest wersji Mojang.",
  releaseDate:"Data publikacji",launcherEnvironment:"LEPSZY SPOSÓB NA MINECRAFTA",browseVersions:"Przeglądaj wersje",systemOverview:"TWÓJ SPRZĘT",
  officialManifest:"MANIFEST WERSJI MOJANG",versionDescription:"Przeglądaj wersje opublikowane przez Mojang. Wybór wersji nie instaluje ani nie uruchamia gry.",
  installerPlanned:"INSTALATOR W TRAKCIE PRAC",plannedFeature:"W PLANACH",gpuPending:"Wykrywanie niezaimplementowane",gpuPendingDetail:"Trwają prace nad natywnym wykrywaniem GPU.",
  detectedMemory:"Wykryte przez system",localReady:"Środowisko aplikacji gotowe",earlyAccess:"WCZESNY ROZWÓJ",preferences:"DOSTOSUJ APLIKACJĘ",
  languageDescription:"Wybierz język interfejsu.",themeDescription:"Wybierz schemat kolorów.",appVersion:"Wersja aplikacji",
  notAffiliated:"Projekt nie jest powiązany z Mojang ani Microsoft."
};

export const dictionaries = { en, pl };
export type TextKey = keyof typeof en;
