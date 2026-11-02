# HWDP Launcher – kompletny launcher Minecrafta od zera

Jesteś starszym inżynierem oprogramowania (desktop, Rust/TypeScript, UX). Zaprojektuj i zaimplementuj od zera **HWDP Launcher** – darmowy, open-source'owy, profesjonalny launcher do Minecrafta (Java Edition), na poziomie Modrinth App / Prism Launcher, ale z własnymi, unikalnymi funkcjami opisanymi niżej. Pracuj etapami: najpierw architektura i plan, potem implementacja moduł po module, z testami. Po każdym etapie pokaż co działa i co zostało.

## 1. Podstawy projektu

- **Nazwa:** HWDP Launcher
- **Platformy:** Windows 10/11 (priorytet), Linux, macOS
- **Stack:** Tauri 2 (Rust backend) + React + TypeScript + Tailwind.
- **Licencja:** MIT lub GPLv3, bez reklam i telemetrii domyślnie.
- **Wydajność:** start poniżej 2 sekund, niskie zużycie RAM, asynchroniczne operacje.
- **Struktura:** modularne repozytorium, README, CONTRIBUTING, CI.

## 2. Ekran ładowania

Przy każdym uruchomieniu animowany ekran z logo, paskiem postępu, aktualnym krokiem i wskazówkami.

Wykonuje:
1. Ładowanie konfiguracji, motywu i języka.
2. Wczytanie instancji, modów i profili.
3. Skan komputera.
4. Weryfikację integralności plików.
5. Sprawdzenie aktualizacji.
6. Odświeżenie cache Modrinth i CurseForge.

Skanowanie może działać w tle. Obsłuż błędy i tryb awaryjny.

## 3. System Scanner

Wykrywa:
- CPU, rdzenie, wątki i taktowanie.
- RAM i jego dostępność.
- GPU, producenta, VRAM, sterowniki, OpenGL i Vulkan.
- Dyski i wolne miejsce.
- System operacyjny, DPI i monitory.
- Zainstalowane wersje Javy.
- Inne launchery i instancje Minecrafta.
- Stan systemu i tryb oszczędzania energii.

Tworzy lokalny profil sprzętowy JSON. Nie wysyła danych sprzętowych na zewnątrz.

## 4. Inteligentne tworzenie instancji

Kreator pozwala wybrać:
- Nazwę i ikonę.
- Wersję Minecrafta.
- Loader: Vanilla, Fabric, Quilt, Forge, NeoForge.
- Wersję Javy.
- Ilość RAM.

Proponuje mody wydajnościowe dopasowane do sprzętu i loadera. Korzysta z aktualnych danych Modrinth API, a w trybie offline z listy awaryjnej.

Uwzględnia Sodium, Lithium, FerriteCore, ModernFix, Entity Culling, ImmediatelyFast, Krypton, More Culling i inne kompatybilne mody.

Pokazuje powody rekomendacji i wykrywa konflikty oraz zależności.

## 5. System oznaczeń wydajności modów

Każdy mod otrzymuje jedno z pięciu oznaczeń:

| Oznaczenie | Znaczenie |
|---|---|
| ⚡ Booster | Poprawia wydajność |
| 🟢 Bezproblemowy | Minimalny wpływ |
| 🟡 Umiarkowany | Średnie obciążenie |
| 🟠 Wymagający | Duże obciążenie |
| 🔴 Pożeracz | Bardzo duże obciążenie |

Stwórz Mod Content Analyzer w Rust.

Analizuje:
- Metadane moda.
- Bytecode klas i mixiny.
- Hooki ticków i renderowania.
- Tekstury, modele, dźwięki i shadery.
- Generowanie świata.
- Biblioteki natywne i JNI.
- Liczbę bloków, przedmiotów i encji.
- Wątki, sieć i reflection.
- Potencjalne konflikty z Sodium i Embeddium.

Wynik: score 0–100, składowe CPU, RAM/VRAM, ładowanie, generowanie świata i konflikty.

Pokazuje uzasadnienie oceny. Uwzględnia sprzęt użytkownika, cache SHA-512, opcjonalne benchmarki i ręczne nadpisywanie oznaczeń.

Analiza musi być statyczna. Nigdy nie uruchamiaj kodu moda podczas skanowania.

## 6. Format .hwdp

Własny format `.hwdp` oparty na ZIP.

Zawiera:
- `hwdp.index.json`
- Manifest wersji i modów.
- Hashe SHA-1/SHA-512.
- Informacje o loaderze i Minecraft.
- Zalecane ustawienia.
- Foldery overrides, client-overrides i server-overrides.
- Opcjonalną ikonę, opis i changelog.

Obsługuj import:
- Modrinth `.mrpack`.
- CurseForge `.zip`.
- Prism i MultiMC.
- ATLauncher.
- Zwykłe archiwa ZIP.

Obsługuj eksport `.hwdp` i `.mrpack`.

Zabezpiecz import przed zip-slip, path traversal i nieznanymi źródłami.

Przygotuj `docs/HWDP_FORMAT.md` i JSON Schema.

## 7. Zarządzanie modami

Integracja z Modrinth API i CurseForge API.

Funkcje:
- Wyszukiwanie i filtry.
- Szczegóły modów i changelogi.
- Instalacja z zależnościami.
- Wykrywanie konfliktów.
- Aktualizacje.
- Rollback.
- Włączanie i wyłączanie modów.
- Profile modów.
- Weryfikacja hashy.
- Drag & drop plików JAR.

## 8. Ustawienia

**Ogólne:**
- Język.
- Motyw jasny, ciemny i AMOLED.
- Skalowanie UI.
- Animacje.
- Katalog danych.
- Powiadomienia.
- Aktualizacje stable/beta.

**Gra:**
- RAM Xms/Xmx.
- Automatyczny dobór Javy.
- Argumenty JVM i presety.
- Argumenty gry.
- Rozdzielczość.
- Pełny ekran.
- Wybór GPU.

**Sieć:**
- Równoległe pobieranie.
- Limit prędkości.
- Proxy.
- Mirrory.
- Timeouty.

**Prywatność:**
- Telemetria domyślnie wyłączona.
- Raportowanie błędów tylko za zgodą.

## 9. Konta i uruchamianie gry

- Logowanie Microsoft/Xbox/Minecraft.
- OAuth 2.0 Device Code Flow.
- Bezpieczne przechowywanie tokenów.
- Wiele kont.
- Podgląd skinów i peleryn.
- Pobieranie Minecrafta, bibliotek i assetów.
- Instalacja loaderów.
- Uruchamianie gry.
- Logi na żywo.
- Przycisk zatrzymania procesu.

## 10. Funkcje profesjonalnego launchera

- Strona główna i ostatnio uruchamiane instancje.
- Zarządzanie instancjami.
- Analizator crashy.
- Backupy światów i instancji.
- Menedżer światów.
- Lista serwerów.
- Galeria screenshotów.
- Optymalizacja instancji.
- Dashboard wydajności.
- System aktualizacji.
- Menedżer pobierania.
- Menedżer Javy.
- Tryb odzyskiwania.
- Discord Rich Presence.
- Skróty klawiszowe.
- API/CLI.

## 11. Internacjonalizacja

Pełne tłumaczenia:
- Polski (pl).
- Angielski (en).

Architektura umożliwia dodawanie kolejnych języków. Automatyczne wykrywanie języka systemowego, fallback do angielskiego, obsługa RTL i liczby mnogiej.

## 12. UX i wygląd

- Nowoczesny interfejs.
- Płynne animacje.
- Responsywne okno.
- Własny pasek tytułu.
- Motyw ciemny jako domyślny.
- Motyw jasny i AMOLED.
- Onboarding przy pierwszym uruchomieniu.
- Czytelne komunikaty błędów z rozwiązaniami.

## 13. Bezpieczeństwo

- Oficjalne API Mojang, Microsoft, Modrinth i CurseForge.
- HTTPS.
- Weryfikacja hashy.
- Statyczna analiza modów.
- Wykrywanie podejrzanych plików.
- Szyfrowane przechowywanie tokenów.
- Brak wycieków danych wrażliwych.
- Respektowanie praw autorów i ograniczeń dystrybucji.

## 14. Testy i dokumentacja

- Testy jednostkowe.
- Testy integracyjne.
- Testy UI Playwright.
- Testowe mody do kalibracji analizatora.
- Logowanie błędów.
- Dokumentacja.
- Instalatory Windows, Linux i macOS.

## 15. Roadmap

1. Szkielet projektu, CI, konfiguracja, i18n i motywy.
2. Ekran ładowania i System Scanner.
3. Logowanie Microsoft, pobieranie i uruchamianie Vanilla.
4. Loadery, instancje i Java.
5. Modrinth i CurseForge.
6. Mod Content Analyzer i oznaczenia.
7. Format `.hwdp` i import/eksport.
8. Zaawansowane ustawienia, crashe i backupy.
9. UX, testy, dokumentacja i wydanie 1.0.

## 16. Zasady dodatkowe

- Konto offline istnieje WYŁĄCZNIE w buildzie deweloperskim (`cfg(debug_assertions)` w Rust, `import.meta.env.DEV` we frontendzie). W wydaniu go nie ma.
- Wydanie produkcyjne wymaga logowania Microsoft i potwierdzonego zakupu Minecrafta.
- Konto offline w dev: nazwa gracza + UUID z `OfflinePlayer:<nazwa>`.
- Biblioteka modów jak w Feather Client: Modrinth + CurseForge, zakładki Mody/Modpacki/Resourcepacki/Shadery, wyszukiwarka, filtry i instalacja.
- Punkt przywracania przed każdą zmianą modów.
- Przycisk „Dlaczego mi się zacina?” z diagnozą prostym językiem.
- Wskaźnik „Gotowe do gry” (zielony/żółty/czerwony) przed startem.
- Sekrety (Client ID, klucze API) tylko w `.env`, nigdy bezpośrednio w kodzie.
- Nigdy nie umieszczaj `.env` w repozytorium Git.
- Nie omijaj weryfikacji zakupu gry.

## Zasady pracy

Zadawaj pytania tylko wtedy, gdy jest to naprawdę konieczne. Przyjmuj rozsądne założenia i opisuj je.

Pisz czysty, modularny, skomentowany kod.

Pracuj etapami. Nie implementuj wielu etapów jednocześnie.

Na końcu każdego etapu podaj:
1. Co zrobiono.
2. Jak uruchomić i przetestować.
3. Znane ograniczenia.
4. Następny krok.

Zacznij od architektury i struktury repozytorium. Implementuj dopiero po zatwierdzeniu planu.