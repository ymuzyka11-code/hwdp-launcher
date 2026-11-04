# HWDP Launcher

A Windows-first Minecraft Java Edition launcher built with Tauri 2, Rust, React and TypeScript.

## Developer preview

The `dev/developer-preview` branch is an early development build. It is not a finished launcher.

### Requirements
- Windows 10/11 x64
- Node.js 22+
- Rust stable toolchain
- Microsoft Edge WebView2 Runtime

### Run from source
```powershell
npm ci
npm run tauri dev
```

### Build the Windows installer locally
```powershell
npm ci
npm run tauri build -- --bundles nsis
```

The NSIS installer is produced under `src-tauri/target/release/bundle/nsis/`.

### Download a CI developer installer
Open **Releases** and download the Windows `.exe` installer attached to the **HWDP Launcher – Developer Preview** prerelease. The release is refreshed automatically after each successful push to `dev/developer-preview`. If the release is not visible yet, open **Actions**, select the latest **Windows installer** run, and wait for it to finish successfully; the same installer is also attached as the `HWDP-Launcher-Windows-x64-Setup` workflow artifact.

## Current implementation status

- Tauri desktop shell and React interface
- Polish/English interface and dark/light/AMOLED themes
- Local hardware information scan
- Mojang version manifest listing
- Download of the selected Minecraft client JAR with SHA-1 verification

## Not implemented yet

- Complete Minecraft installation (libraries, assets, natives and version-specific launch arguments)
- Starting a Minecraft game process
- Microsoft/Xbox/Minecraft account authentication
- Modrinth and CurseForge browsing and installation
- Modpack import/export, profile management and mod-content analysis
- Signed production installer and automatic updates

**Authentication note:** a developer/offline profile can be used to develop the launcher UI, but it does not grant Minecraft ownership, Microsoft authentication, multiplayer access to authenticated servers, or permission to bypass account checks. Offline play is limited to environments that explicitly allow offline-mode accounts. Do not enter Microsoft passwords or tokens into this preview.

## Project goals

See the project issue tracker and roadmap. Contributions are welcome; never commit API secrets, OAuth client secrets, access tokens, or personal diagnostic data.
