# HWDP Launcher signed auto-updates

Tauri's updater requires signed update bundles. Do not disable signature verification and never commit the private signing key.

## Generate the permanent key pair (Windows PowerShell)

Run this once from the repository root:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.tauri" | Out-Null
npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\hwdp-launcher.key"
```

Choose a password and keep it safe. The command prints a public key and writes the private key to the file above.

## Configure GitHub Actions

In GitHub repository Settings → Secrets and variables → Actions:

- Add secret `TAURI_SIGNING_PRIVATE_KEY` containing the complete contents of `hwdp-launcher.key`.
- Add secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` containing the password (if one was set).
- Add repository variable `TAURI_SIGNING_PUBLIC_KEY` containing the public key printed by the command.

Never send or publish the private key. The public key is safe to share.

## Finish the updater integration

After the public key is available, embed it in `src-tauri/tauri.conf.json`, add the Tauri updater Rust/JS plugins and updater permission, and enable `bundle.createUpdaterArtifacts`. The Windows workflow must publish the signed NSIS updater bundle, its `.sig` file, and the updater manifest to the `launcher-preview` GitHub Release.

The release workflow now publishes the latest ordinary Windows installer to that preview release. Existing installations will not self-update until the signed updater integration above is completed and a new signed installer is installed once.
