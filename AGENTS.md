# AGENTS.md

Instructions and invariants for AI coding agents working on **LinkQR**.

## Architecture & Single Source of Truth

This repository houses a **cross-browser Manifest V3 extension** (`/extension/`) targeting **Firefox (109+)**, **Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi, Arc)**, and **Safari**, alongside a **React + Vite interactive sandbox and `.zip` packager** (`/src/`).

- **`/extension/` is the single source of truth** for the browser extension:
  - `extension/manifest.json` — Firefox MV3 manifest (`strict_min_version: "109.0"`, `background.scripts`, `"theme"` permission, Gecko ID, SVG icon).
  - `extension/manifest.chromium.json` — W3C-standard MV3 manifest for Chromium & Safari (`background.service_worker`, PNG icons `16/32/48/128`, no Firefox-only keys).
  - `extension/background.js` — Shared cross-browser MV3 event page / service worker using a zero-dependency `browser ?? chrome` runtime shim, context menus, and optional `theme.getCurrent()`.
  - `extension/content.js` — Shared right-click coordinate tracker, Firefox theme / `prefers-color-scheme` contrast guard, and Shadow DOM floating QR card.
  - `extension/qrcodegen.js` — Compiled ES2020 build of Project Nayuki’s MIT-licensed `qrcodegen.ts` (vendored; do not hand-edit).
  - `extension/icons/icon.svg` + `icon-16/32/48/128.png` — Native SVG icon for Firefox and raster PNG icons for Chromium/Safari (regenerated deterministically via `node scripts/generate-icons.mjs`).
  - `extension/README.md` — End-user installation readme included inside both downloadable ZIPs.
- **`src/lib/extensionFiles.ts`** imports all files directly from `/extension/` using Vite `?raw` and static PNG imports, assembling either the `'firefox'` or `'chromium-safari'` bundle. Never duplicate extension code as inline strings inside `src/`.
- **Sandbox parity**:
  - `src/lib/qrEncoder.ts` wraps `src/lib/vendor/qrcodegen.ts` (same Nayuki library as `extension/qrcodegen.js`, using `Ecc.MEDIUM` with `boostEcl = true` and fallback to `Ecc.LOW`).
  - `src/lib/themeResolver.ts` mirrors the exact WCAG luminance contrast guard and `prefers-color-scheme` fallback in `extension/content.js`.
  - If you change popup layout, positioning, or theme contrast logic in `extension/content.js`, keep `src/components/FloatingQrCard.tsx` and `src/lib/themeResolver.ts` aligned.

## Non-Negotiable Product & Technical Invariants

1. **Cross-Browser Manifest V3 Separation**:
   - Keep `extension/manifest.json` compliant with Firefox MV3 (`background.scripts`, `browser_specific_settings.gecko`, `"theme"` permission).
   - Keep `extension/manifest.chromium.json` strictly free of Firefox-only keys (`theme`, `browser_specific_settings`, `background.scripts`, `.svg` icons) and Chrome-only vendor keys so it loads with zero warnings in Chrome, Edge, Brave, and Safari (`xcrun safari-web-extension-converter`).
2. **Cross-Browser Background Runtime Rules (`extension/background.js`)**:
   - Keep the zero-dependency `globalThis.browser` / `globalThis.chrome` shim handling Promise-based `browser.*` (Firefox/Safari) and callback-based `chrome.*` (`contextMenus.removeAll`, `contextMenus.create`, `tabs.sendMessage`).
   - Register `runtime.onInstalled`, `runtime.onStartup`, and `contextMenus.onClicked` synchronously at the top level (required for both Firefox event pages and Chromium/Safari MV3 service workers).
   - Keep the `scripting.executeScript` fallback so LinkQR works on tabs already open before installation.
3. **Context Menu Scope**:
   - Support three triggers across all browsers: `link`, `selection`, and `page`.
4. **Minimal Floating QR Card**:
   - Anchor near the right-clicked link/cursor with viewport edge clamping (flipping above the link when near the bottom edge).
   - Keep the popup minimal and distraction-free: display only the scannable QR SVG (with mandatory 4-module quiet zone), a subtle truncated payload caption, and a quiet close button (`Esc` and outside click dismiss). Do not add action toolbars or extra buttons inside the popup unless explicitly requested.
   - Always render inside a Shadow DOM root at maximum z-index (`2147483647`) so host website CSS cannot break styling.
5. **Theming & QR Scannability Contrast Guard**:
   - On Firefox, read active theme colors in `background.js` via guarded `extApi.theme?.getCurrent(tab.windowId)` and pass them to `content.js`.
   - On Chromium and Safari (or Firefox System Theme), `themeColors` is `null` and `content.js` falls back automatically to `prefers-color-scheme` Light/Dark mode.
   - Never render inverted light-on-dark QR modules. Only use native surface/ink colors for QR modules when `bgLum > 0.65`, `bgLum > fgLum`, and WCAG contrast ratio is `>= 7.0`. Otherwise keep the themed/dark card frame and render the QR code on an inner `#FFFFFF` plate with `#111111` modules.
6. **Offline & Privacy Guarantee**:
   - Never introduce external QR APIs, analytics, or network requests inside `/extension/`.
7. **Vendored Files**:
   - Do not hand-edit `extension/qrcodegen.js` or `src/lib/vendor/qrcodegen.ts`. Both originate verbatim from `nayuki/QR-Code-generator` (`typescript-javascript/qrcodegen.ts`, MIT License).
8. **Playground Build & GitHub Pages CI**:
   - Keep `base: process.env.VITE_BASE_PATH || (command === 'build' ? './' : '/')` and `import.meta.dirname` (not `__dirname`) in `vite.config.ts` so production builds work at any GitHub Pages subpath with zero Vite 8 warnings.
   - Keep `jszip` (`src/lib/zipBuilder.ts`), `ExtensionSourceViewer`, and `InstallGuide` (`src/App.tsx`) lazily imported so the main bundle stays under Vite’s 500 kB chunk warning threshold.
   - Keep `.github/workflows/deploy-pages.yml` working both with and without `package-lock.json` (`npm ci` when present, `npm install` otherwise), and avoid adding unused packages that create peer conflicts during clean CI installs.

## Verification & Packaging Commands

Run all three verification commands after making changes (the GitHub Pages workflow runs all three automatically on pushes to `main`):

```bash
npm run verify:extension   # Validates Firefox & Chromium/Safari manifests, PNG icons, mocked runtimes, QR parity, and contrast guard
npm run lint               # TypeScript type-check (tsc --noEmit)
npm run build              # Vite production bundle (should finish with zero warnings)
npm run package:extension  # Optional: outputs unpacked dist-extension/{firefox,chromium-safari}/ folders for local testing
```
