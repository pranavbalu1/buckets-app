# Desktop app

Buckets has a Windows desktop app built with Electron. The installer is available from the web app's [Download desktop app page](/download) and the [GitHub Releases page](https://github.com/pranavbalu1/buckets-app/releases).

## Run locally

1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`.
2. Run `npm run desktop:dev` to start Vite and open the desktop window.
3. Run `npm run desktop:package:win` to create the Windows installer under `release-desktop/`.

The production installer uses the current Windows machine's architecture. The local package configuration also has macOS and Linux targets; those installers are not included in the current public release. macOS distribution requires signing and notarization for a smooth install outside local development.

## Desktop updates

The installed Windows app checks GitHub Releases on launch and also has a **Check for updates** control in Settings. When a release is available, Buckets asks before downloading it; after download, choose **Restart and install** to apply it. Update checks and downloads run in the desktop main process, not in the web app.

Version `0.2.0` is the first updater-enabled desktop release and is now available on GitHub Releases. Users on `v0.1.0` must install `v0.2.0` manually once; later versions can be installed through the app.

To roll out a later desktop fix:

1. Increase the `version` in `package.json` for each release (for example, from `0.2.0` to `0.2.1`).
2. Build on Windows with `npm run desktop:package:win`.
3. Create and publish a public GitHub Release tagged `v<version>` (for example, `v0.2.1`). Attach every updater artifact from `release-desktop/`, including `Buckets-Setup.exe`, `latest.yml`, and `Buckets-Setup.exe.blockmap` when generated.

The release must be published, not left as a draft, for installed apps to find it. The `v0.1.0` installer predates the updater, so its users must install `v0.2.0` manually once. Later releases can be downloaded and installed from inside the desktop app. Only the Windows installer currently has an update feed.

## Receipt scanner

Receipt scanning is available in the desktop app. PaddleOCR model files and its matching ONNX WebAssembly runtime are bundled with the installer. The optional semantic bucket classifier downloads its quantized model on first use. Receipt images and extracted text are processed locally; only confirmed transaction fields are submitted to the user's Supabase account.

The desktop window serves the built app through a private `app://buckets` origin, including the local OCR assets, and runs the renderer without Node.js integration.
