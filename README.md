# LinkQR — Firefox Extension & Interactive Sandbox

**LinkQR** is a lightweight, offline Manifest V3 Firefox extension that lets you right-click any link, highlighted text selection, or webpage to display a crisp, theme-matched floating QR code right beside your cursor for instant phone scanning.

- **Live Playground & `.zip` Downloader**: [kumaranshul1.github.io/LinkQR](https://kumaranshul1.github.io/LinkQR/)

This repository contains both:

1. **`/extension/`** — The ready-to-load Firefox Manifest V3 WebExtension (`manifest.json`, `background.js`, `content.js`, `qrcodegen.js`, `icons/icon.svg`).
2. **`/src/`** — An interactive web sandbox, Firefox theme previewer, source inspector, and one-click `.zip` packager that imports `/extension/` directly as its single source of truth.

## Features

- **Right-click triggers**: Links (`Show QR Code for Link`), highlighted text (`Show QR Code for Selection`), and page background (`Show QR Code for This Page`).
- **Native Firefox theme matching**: Uses the Firefox `theme` API (`browser.theme.getCurrent(tab.windowId)`) to match your browser’s `popup`, `popup_text`, and `popup_border` colors, falling back to `prefers-color-scheme` on the default system theme.
- **Automatic QR contrast safeguard**: Renders QR modules in your theme’s ink on high-contrast light themes (`>= 7:1`), and automatically frames the QR matrix on a crisp white quiet-zone plate on dark or colorful themes so phone cameras always scan reliably.
- **Ultra-minimal Shadow DOM overlay**: Displays only the scannable vector QR code, a subtle truncated URL/text caption, and a quiet close button—dismissible with `Esc` or clicking outside, isolated from host page CSS.
- **100% offline**: Powered by Project Nayuki’s MIT-licensed [QR-Code-generator](https://github.com/nayuki/QR-Code-generator) with optimal Numeric/Alphanumeric/Byte segmentation and automatic error-correction boosting (`boostEcl`).

## Load Directly in Firefox (No Build Required)

1. Open Firefox (version 109+) and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select `extension/manifest.json` from this repository.
4. Right-click any link, text selection, or page to display its QR code.

For permanent installation on Firefox Release, zip the contents of `extension/` (or click **Download Extension (.zip)** in the web studio) and submit it under **On your own** (unlisted self-distribution) at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) to receive a signed `.xpi`.

## Live Playground on GitHub Pages

This repository includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that verifies the extension and deploys the interactive playground (including the one-click `.zip` downloader) automatically on every push to `main`.

To enable it once pushed to GitHub:

1. Open your repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main` (or trigger the **Deploy Playground to GitHub Pages** workflow manually from the **Actions** tab). Your live playground will be published at `https://<your-username>.github.io/<your-repo>/`.

## Development & Verification

```bash
npm install
npm run dev               # Start the interactive sandbox on http://localhost:3000
npm run verify:extension  # Validate manifest.json, JS syntax, QR parity, and contrast guard
npm run lint              # TypeScript type-check (tsc --noEmit)
npm run build             # Production build
```

## Project Structure

- `extension/` — Standalone Firefox Manifest V3 extension source (single source of truth).
- `src/lib/extensionFiles.ts` — Imports `extension/*` via Vite `?raw` imports for the UI source viewer and `.zip` builder.
- `src/lib/qrEncoder.ts` — TypeScript wrapper around vendored Project Nayuki `qrcodegen` (`src/lib/vendor/qrcodegen.ts`) used by the sandbox.
- `src/lib/themeResolver.ts` — Firefox theme presets and WCAG relative-luminance contrast guard shared with the sandbox.
- `src/components/` — Interactive Firefox browser simulator, floating QR card, source inspector, and install guide.
- `scripts/verify-extension.mjs` — Automated verification script for the extension package and QR encoder.
- `.github/workflows/deploy-pages.yml` — GitHub Actions workflow that verifies, builds, and deploys the playground to GitHub Pages on pushes to `main`.

## License & Attribution

- QR code generation uses Project Nayuki’s [QR-Code-generator](https://github.com/nayuki/QR-Code-generator) under the MIT License.
