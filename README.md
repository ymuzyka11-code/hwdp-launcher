# HWDP Launcher

An open-source desktop launcher project for Minecraft: Java Edition, built with Tauri 2, React, TypeScript and Rust.

> **Development status:** early development. This repository is not yet a complete Minecraft launcher and does not currently install or start the game.

## Current foundation

- Tauri 2 desktop shell with React and TypeScript.
- Rust backend for basic system information.
- Official Mojang version-manifest reader.
- Polish and English interface.
- Dark, light and AMOLED themes.
- Initial GitHub Actions checks for the frontend and Rust backend.
- Windows installer and website deployment workflows prepared for later releases.

## Not implemented yet

- Microsoft / Xbox / Minecraft Services authentication and ownership verification.
- Complete Minecraft installation (libraries, assets, native files and Java runtime).
- Game launch command construction, process supervision and logs.
- Instance management and mod-loader installation.
- Modrinth and CurseForge integration.
- Mod management, backups, crash analysis and the `.hwdp` pack format.

The interface labels unfinished features as planned or in development. Do not treat a visible menu item as proof that a feature is already available.

## Requirements

- Windows 10 or newer (for the desktop application).
- Node.js 22.12+ and npm.
- Rust stable toolchain.
- Microsoft C++ Build Tools and the WebView2 runtime, as required by Tauri on Windows.

## Development

Install JavaScript dependencies:

```bash
npm ci
```

Run the desktop app in development mode:

```bash
npm run tauri dev
```

Build the frontend:

```bash
npm run build
```

Build Windows installers:

```bash
npm run tauri build
```

The Windows release workflow is configured to build NSIS and MSI installers when a version tag such as `v0.1.0` is pushed. Release artifacts are published as a draft for review; they are not committed to the Git repository.

## Website

The static project website lives in `website/`. GitHub Pages deployment is configured through `.github/workflows/pages.yml`.

To enable it, open **Repository Settings → Pages** and set the build/deployment source to **GitHub Actions**. After the workflow runs on `main`, the site will be available at:

`https://ymuzyka11-code.github.io/hwdp-launcher/`

## Security and authentication

The planned release must use the official Microsoft/Xbox/Minecraft authentication flow and verify Minecraft: Java Edition ownership through Minecraft Services. The project will not provide cracked, offline-authentication or license-bypass modes.

Never commit OAuth secrets, API keys, access tokens, signing certificates or local `.env` files. Use GitHub Actions secrets for release-only credentials.

## Third-party services

- Mojang: official game version metadata and game assets.
- Microsoft / Xbox / Minecraft Services: planned account authentication and entitlement verification.
- Modrinth: planned mod discovery and downloads.
- CurseForge: planned integration subject to its API access terms and credentials.

HWDP Launcher is an independent community project and is not affiliated with, endorsed by, or sponsored by Mojang or Microsoft.

## License

MIT. See [LICENSE](LICENSE).
