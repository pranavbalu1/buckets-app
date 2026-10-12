# Desktop app

Buckets has a Windows desktop app built with Electron. The installer is available from the web app's [Download desktop app page](/download) and the [GitHub Releases page](https://github.com/pranavbalu1/buckets-app/releases).

## Run locally

1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`.
2. Run `npm run desktop:dev` to start Vite and open the desktop window.
3. Run `npm run desktop:package:win` to create the Windows installer under `release-desktop/`.

The production installer uses the current Windows machine's architecture. The local package configuration also has macOS and Linux targets; those installers are not included in the current public release. macOS distribution requires signing and notarization for a smooth install outside local development.

## Receipt scanner

Receipt scanning is available in the desktop app. PaddleOCR model files and its matching ONNX WebAssembly runtime are bundled with the installer. The optional semantic bucket classifier downloads its quantized model on first use. Receipt images and extracted text are processed locally; only confirmed transaction fields are submitted to the user's Supabase account.

The desktop window serves the built app through a private `app://buckets` origin, including the local OCR assets, and runs the renderer without Node.js integration.
