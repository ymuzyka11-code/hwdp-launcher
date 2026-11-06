# HWDP Launcher signed auto-updates

The launcher now checks for signed Windows updates at startup. Updates are downloaded and installed by the Tauri updater plugin, then the app restarts. Existing installations need one replacement install made with this signing key before they can self-update.

## GitHub Actions secrets

In GitHub repository Settings → Secrets and variables → Actions → Repository secrets, configure:

- `TAURI_SIGNING_PRIVATE_KEY`: the complete contents of your private `hwdp-launcher.key` file.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the password used when generating that key (leave unset only if the key has no password).

The matching public key is embedded in `src-tauri/tauri.conf.json`. It is safe to publish. Never commit, paste into chat, or upload the private key.

## Build and release flow

Pushing to `release/microsoft-launcher-integration` builds a signed NSIS installer and updater archive, generates `latest.json`, and updates the GitHub prerelease named `launcher-preview`. The updater checks:

`https://github.com/ymuzyka11-code/hwdp-launcher/releases/latest/download/latest.json`

The release contains the normal `.exe`, signed `.nsis.zip` updater bundle, `.sig` signature, and manifest. Versioned tags named `vX.Y.Z` publish versioned releases.

## First installation required

A launcher installed before signed updating was enabled cannot magically acquire the updater plugin. Install the new signed preview installer once. After that, future compatible releases can install from inside the launcher without downloading and running the setup EXE manually.

## If an update does not appear

- Confirm both signing secrets exist and match the public key in the config.
- Open the latest GitHub Actions run and check the Windows installer job.
- Confirm the `launcher-preview` release contains `latest.json`, a `.nsis.zip`, and its matching `.sig`.
- Do not replace the signing key after distributing an installer. Changing it breaks signature verification for already-installed clients.
