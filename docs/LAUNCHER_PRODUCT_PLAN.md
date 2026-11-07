# HWDP Launcher — product and implementation plan

## Product direction

HWDP Launcher is a Windows-first Minecraft: Java Edition launcher. The goal is a focused desktop experience: create and manage game instances, launch them reliably, discover compatible Modrinth content, and manage skins/modpacks. It is not a clone of Modrinth's website and will not grow into a hosting platform, social network, marketplace, or account platform.

Keep the existing Microsoft authentication and Minecraft ownership verification flow intact. Do not add offline-mode or authentication bypasses.

## What the current repository actually contains

The current `main` branch is an early Tauri 2 + React 19 + TypeScript + Vite application.

- `src/App.tsx`: single-component UI with Home, Minecraft version selection, empty Instances and Mods pages, and Settings.
- `src/App.css`: small set of theme variables and splash-screen styles.
- `src/i18n.ts`: English and Polish dictionaries.
- `src-tauri/src/lib.rs`: hardware information, Mojang version manifest retrieval, version metadata retrieval, and a client JAR downloader with size and SHA-1 verification.
- `src-tauri/tauri.conf.json`: Tauri window currently configured at 800×600.

Important implementation gap: downloading `client.jar` alone is not a complete Minecraft installation. A runnable installation also needs version metadata, libraries, assets, natives, runtime selection, classpath/arguments, and safe progress/error handling. The current `main` branch does not expose the instance/authentication/launch commands seen in earlier development snippets, so those must not be assumed to exist here. Before changing branches or merging, compare the known-good branch/build and preserve its working Microsoft sign-in and launch flow.

## Product scope for the next releases

### P0 — trustworthy launcher foundation

1. Establish a clear application shell:
   - persistent left navigation: Play, Instances, Discover, Skins, Settings;
   - compact account/status area;
   - content area with consistent page headers, spacing, empty states, loading states, and actionable errors;
   - responsive layout for the Tauri window, keyboard focus, and accessible labels.
2. Make Play a real control:
   - show the selected instance, game version, loader, and account state;
   - disable launch only when a specific prerequisite is missing and explain why;
   - show launch/install progress and the actionable failure message.
3. Instances:
   - list installed instances with name, Minecraft version, loader, last played, and status;
   - create, edit, duplicate, delete (with confirmation), and select an instance;
   - keep each instance isolated in its own game directory;
   - do not claim an instance is installed until all required files are present and verified.
4. Downloads:
   - central queue with queued/downloading/verifying/complete/failed/cancelled states;
   - per-task progress, speed/size where available, retry, and open-log actions;
   - never report success before the backend confirms integrity checks.
5. Preserve existing Polish/English and dark/light/AMOLED preferences.

### P1 — Modrinth discovery and installation

1. Use the public Modrinth API for project search and project/version details.
2. Search by text and filter by project type (start with mods), game version, and loader (Fabric, Forge, NeoForge, Quilt).
3. Project cards show icon, title, author, short description, downloads, and compatibility.
4. Project detail view shows description, supported versions/loaders, gallery when supplied, and versions.
5. Install flow must first select a target instance, then resolve a compatible version and its required dependencies. Show conflicts/incompatibilities before writing files.
6. Track installed project/version IDs in instance metadata so updates and removals are reliable. Do not install arbitrary files into the global game directory.

### P2 — skins and modpacks

1. Skin library: import PNG, preview the skin, select classic/slim model, and apply through the authenticated Minecraft profile API only when the relevant supported endpoint/permissions are available.
2. Modpack management: import/export a documented pack format (start with Modrinth `.mrpack`), inspect the manifest, resolve dependencies, and display files requiring manual download rather than silently bypassing distribution restrictions.
3. Provide clear backup/restore points before bulk changes.

## UX information architecture

| Page | Primary purpose | Primary action |
| --- | --- | --- |
| Play | Launch the selected instance and see recent activity | Play |
| Instances | Create and maintain isolated game setups | New instance |
| Discover | Find compatible mods for the selected instance | Install to instance |
| Skins | Preview and manage owned/imported skins | Apply skin |
| Settings | Account, language, theme, memory and launcher preferences | Save setting |

Avoid dashboard clutter. The Play page should prioritize the selected instance and one dominant Play action, with recent instances and recent download activity secondary. Hardware details belong in a collapsible system-information panel in Settings, not as the main purpose of the home screen.

## Suggested frontend structure

Move page-level responsibilities out of the current monolithic `App.tsx`:

```text
src/
  app/
    App.tsx
    navigation.ts
  components/
    AppShell.tsx
    Sidebar.tsx
    PageHeader.tsx
    StatusBadge.tsx
    EmptyState.tsx
    ConfirmDialog.tsx
    DownloadQueue.tsx
  features/
    play/
    instances/
    discover/
    skins/
    settings/
  lib/
    tauri.ts
    modrinth.ts
    format.ts
  i18n/
    index.ts
    en.ts
    pl.ts
  styles/
    tokens.css
```

Use typed feature APIs and keep Tauri `invoke` calls in `src/lib/tauri.ts`; keep Modrinth HTTP/API handling in `src/lib/modrinth.ts`. Components should render state and emit user intent, not contain filesystem or authentication logic.

## Backend boundaries and data model

Keep filesystem operations, process launch, authentication tokens, and game installation in Rust. The frontend should receive typed, non-secret summaries.

Initial local models:

- `Instance`: id, name, gameVersion, loader, loaderVersion, gameDirectory, createdAt, lastPlayedAt, installState.
- `InstanceContent`: instanceId, projectId, versionId, fileName, fileHash, installedAt.
- `DownloadTask`: id, kind, targetInstanceId, label, state, downloadedBytes, totalBytes, error, createdAt, updatedAt.
- `LauncherSettings`: language, theme, memoryMin, memoryMax, downloadConcurrency, selectedInstanceId.
- `SkinEntry`: id, name, model, localPath, source, updatedAt.

Persist local metadata atomically (write temporary file then rename, or use SQLite once concurrent updates/querying justify it). Validate all IDs and paths in Rust; never trust frontend-provided paths. Store secrets only in an OS-protected credential store, not settings JSON or logs.

## Implementation sequence (small reviewable commits)

1. `refactor(ui): introduce typed app shell and page navigation`
   - Extract shell/navigation/page components; preserve current settings and localization.
2. `feat(instances): add persistent instance metadata and CRUD commands`
   - Rust validation and atomic persistence; frontend list/create/edit/delete flows.
3. `feat(installer): implement complete vanilla installation pipeline`
   - Manifest/details, libraries, assets, natives, Java/runtime checks, verification, cancellation, progress events, and tests. Do not wire Play to the current client-JAR-only downloader.
4. `feat(launcher): launch selected installed instance`
   - Reuse the project's verified Microsoft account flow; construct process arguments from trusted metadata; capture logs and exit status.
5. `feat(downloads): add task queue and consistent status reporting`
   - One status model for installation and content downloads.
6. `feat(modrinth): add searchable mod browser and compatibility filters`
   - API client, typed responses, loading/empty/error states, pagination.
7. `feat(modrinth): install compatible mods into selected instance`
   - Dependency resolution, conflict display, hashes, rollback on failure.
8. `feat(skins): add skin library and preview workflow`
9. `feat(modpacks): import and export Modrinth mrpack`
10. `chore(release): publish signed updater-ready Windows builds`
   - Only after updater signing keys/secrets and update endpoint are configured.

## Quality gates

- Run frontend typecheck/build and Rust formatting/tests on every pull request.
- Add tests for path traversal rejection, instance metadata persistence, download hash mismatch, dependency conflicts, and launch argument construction.
- Test a clean Windows install, upgrade over an existing install, interrupted download, missing Java runtime, invalid account, and failed game process.
- Keep release artifacts separate from source commits. GitHub Actions should build the installer; a GitHub commit alone does not update already-installed launchers. Installed copies update only after a release is published and the updater is configured and signed correctly.

## Explicitly out of scope for this focused launcher

No user-upload hosting platform, public creator profiles, organizations, social feed, payments/subscriptions, advertising, server hosting, public API platform, or web marketplace. Those features add substantial operational/security work and do not improve the core desktop launcher loop.

## Known-good development branch

The repository's `release/microsoft-launcher-integration` branch is materially ahead of `main` and is the correct starting point for feature work because it contains the working launcher flow referenced by the project owner.

Reviewed files on that branch confirm that it already includes:

- Microsoft device-code sign-in, account lookup, and sign-out commands.
- Persistent profile/instance metadata with list, create, and delete commands.
- Minecraft launch through CrustCore using the saved Microsoft account.
- Modrinth project search and installation commands, including required-version dependency downloads.
- CurseForge search/install command registration.
- Tauri updater and process plugins, plus a configured Windows NSIS updater artifact and endpoint.

Therefore the implementation sequence should begin from this branch, not by rebuilding these features on `main`. The next engineering iteration should focus on UX architecture and reliability around the existing capabilities: extract the monolithic React screen into feature components, improve the Play/Instances/Discover flows, add structured download/install progress and logs, and test dependency/file handling. Skin management remains a new feature, not an existing one.

The currently reviewed React UI still keeps most state and page rendering in one large `src/App.tsx`; this is the highest-value frontend refactor target. Keep the existing Rust commands stable while extracting the frontend, then improve backend contracts incrementally with tests.
