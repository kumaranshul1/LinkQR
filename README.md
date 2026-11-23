# LinkQR — Cross-Browser Manifest V3 Extension & Interactive Sandbox

**LinkQR** is a lightweight, offline Manifest V3 browser extension for **Firefox (109+)**, **Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi, Arc)**, and **Safari** that lets you right-click any link, highlighted text selection, or webpage to display a crisp floating QR code right beside your cursor for instant phone scanning.

- **Live Playground & `.zip` Downloader**: [kumaranshul1.github.io/LinkQR](https://kumaranshul1.github.io/LinkQR/)

This repository contains both:

1. **`/extension/`** — Shared Manifest V3 extension core (`background.js`, `content.js`, `qrcodegen.js`, SVG + PNG icons) with per-browser manifests (`manifest.json` for Firefox and `manifest.chromium.json` for Chromium & Safari).
2. **`/src/`** — An interactive multi-browser sandbox, theme/appearance previewer, per-target source inspector, and one-click `.zip` packager that imports `/extension/` directly as its single source of truth.

## Features

- **Cross-browser Manifest V3**: One shared codebase with a zero-dependency `browser ?? chrome` runtime shim and clean per-browser manifests—zero warnings in Firefox, Chrome Web Store, Edge Add-ons, or Safari’s Xcode converter.
- **Right-click triggers**: Links (`Show QR Code for Link`), highlighted text (`Show QR Code for Selection`), and page background (`Show QR Code for This Page`).
- **Browser-native appearance**:
  - **Firefox**: Reads your active browser theme via `browser.theme.getCurrent(tab.windowId)` (`popup`, `popup_text`, `popup_border`).
  - **Chrome, Edge, Brave & Safari**: Follows your browser/OS light and dark appearance via `prefers-color-scheme`.
- **Automatic QR contrast safeguard**: Renders QR modules in your theme’s ink on high-contrast light surfaces (`>= 7:1`), and automatically frames the QR matrix on a crisp white quiet-zone plate in dark mode so phone cameras always scan reliably.
- **Ultra-minimal Shadow DOM overlay**: Displays only the scannable vector QR code, a subtle truncated URL/text caption, and a quiet close button—dismissible with `Esc` or clicking outside, isolated from host page CSS.
- **100% offline**: Powered by Project Nayuki’s MIT-licensed [QR-Code-generator](https://github.com/nayuki/QR-Code-generator) with optimal Numeric/Alphanumeric/Byte segmentation and automatic error-correction boosting (`boostEcl`).

## Installation

### Firefox (109+)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** and select `extension/manifest.json` directly from this repo (or download `linkqr-firefox-mv3.zip` from the playground).
3. For permanent installation on Firefox Release, upload `linkqr-firefox-mv3.zip` under **On your own** at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) to receive a signed `.xpi`.

### Chrome, Edge, Brave, Opera, Vivaldi & Arc
1. Download `linkqr-chromium-safari-mv3.zip` from the [Live Playground](https://kumaranshul1.github.io/LinkQR/) and unzip it.
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`), enable **Developer mode**, click **Load unpacked**, and select the extracted folder.

### Safari (macOS / iOS)
1. Download `linkqr-chromium-safari-mv3.zip` and unzip it to `./linkqr-safari`.
2. Convert it into an Xcode project using Apple’s official tool:
   ```bash
   xcrun safari-web-extension-converter ./linkqr-safari --app-name LinkQR --bundle-identifier com.local.linkqr
   ```
3. Build and run in Xcode, then enable **LinkQR** in **Safari → Settings → Extensions**.

## Live Playground on GitHub Pages

This repository includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that verifies both browser manifests and runtimes, type-checks, builds, and deploys the interactive playground automatically on every push to `main`.

To enable it on a fork:

1. Open your repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main` (or trigger **Deploy Playground to GitHub Pages** manually from the **Actions** tab).

## Development & Verification

```bash
npm install
npm run dev               # Start the interactive sandbox on http://localhost:3000
npm run verify:extension  # Validate Firefox & Chromium manifests, PNGs, runtimes, QR parity, and contrast guard
npm run lint              # TypeScript type-check (tsc --noEmit)
npm run build             # Production build
```

## Project Structure

- `extension/` — Shared cross-browser Manifest V3 extension source (single source of truth):
  - `manifest.json` — Firefox MV3 manifest (`background.scripts`, Gecko ID, `theme` permission, SVG icon).
  - `manifest.chromium.json` — W3C MV3 manifest for Chromium & Safari (`background.service_worker`, PNG icons).
  - `background.js`, `content.js`, `qrcodegen.js` — Shared cross-browser runtime scripts.
  - `icons/` — Native SVG icon (`icon.svg`) and raster PNG icons (`icon-16/32/48/128.png`).
- `src/lib/extensionFiles.ts` — Imports `extension/*` via Vite `?raw` and asset imports to assemble Firefox and Chromium/Safari packages.
- `src/lib/qrEncoder.ts` — TypeScript wrapper around vendored Project Nayuki `qrcodegen` (`src/lib/vendor/qrcodegen.ts`) used by the sandbox.
- `src/lib/themeResolver.ts` — Firefox theme presets, Chromium/Safari light & dark presets, and WCAG contrast guard.
- `src/components/` — Interactive multi-browser simulator, floating QR card, per-target source inspector, and tabbed install guide.
- `scripts/verify-extension.mjs` — Automated verification script for both manifests, PNG integrity, mocked Firefox/Chromium runtimes, and QR parity.
- `scripts/generate-icons.mjs` — Deterministic zero-dependency PNG icon generator matching `extension/icons/icon.svg`.
- `.github/workflows/deploy-pages.yml` — GitHub Actions workflow deploying the playground to GitHub Pages on pushes to `main`.

## License & Attribution

- QR code generation uses Project Nayuki’s [QR-Code-generator](https://github.com/nayuki/QR-Code-generator) under the MIT License.
