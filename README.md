# HWDP Launcher

An open-source desktop launcher for Minecraft: Java Edition, built with Tauri 2, Rust, React and TypeScript.

> **Development status: early prototype.** The current application has a basic interface, local hardware summary and Mojang version-manifest lookup. It is not yet a complete Minecraft launcher and must not be presented as one.

## Current prototype

- Tauri 2 desktop shell
- React + TypeScript frontend
- Polish and English interface strings
- Dark, light and AMOLED themes
- Basic local CPU/RAM/OS/GPU-name scan
- Minecraft version manifest lookup from Mojang
- Experimental client JAR download with SHA-1 verification

The downloaded client JAR alone is **not enough to launch Minecraft**. Full game installation still needs version libraries, assets, natives, correct JVM arguments and an authenticated Minecraft profile.

## Planned work

- Microsoft/Xbox/Minecraft authentication using the official account flow
- Complete vanilla installation and game process management
- Instances and Java runtime management
- Fabric, Quilt, Forge and NeoForge
- Modrinth and CurseForge browsing and dependency-aware installation
- Local hardware profile and explainable performance recommendations
- Safe modpack import/export, crash diagnostics and backups
- Signed, tested Windows installers

## Development

Requirements:
- Node.js 22+
- Rust stable toolchain
- Tauri 2 prerequisites for your operating system

Install dependencies and start the desktop app:

```bash
npm ci
npm run tauri dev
```

Production frontend build:

```bash
npm run build
```

Windows installer build (on Windows):

```bash
npm run tauri build
```

## CI and releases

GitHub Actions runs frontend build checks and a Windows Rust check. Pushing a version tag such as `v0.1.0` starts a Windows NSIS/MSI build and creates a **draft prerelease**. Review the workflow result and test the installer before publishing the draft.

The website source is in `website/`. To enable GitHub Pages, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The Pages workflow then deploys updates to the project website.

## Security and account requirements

- Use official Mojang/Microsoft and mod-platform APIs.
- Never commit OAuth client secrets, API keys or signing keys.
- Microsoft authentication requires a correctly registered application and configured redirect flow; it is not implemented in this prototype yet.
- CurseForge access requires an API key and must follow CurseForge's terms. Do not scrape or bypass download restrictions.
- Mod JARs must be treated as untrusted files. Static analysis must never execute mod code.

## License

MIT. See [LICENSE](LICENSE).

HWDP Launcher is an independent community project and is not affiliated with Mojang or Microsoft.
