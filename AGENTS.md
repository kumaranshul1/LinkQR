# AGENTS.md

Instructions and invariants for AI coding agents working on **LinkQR**.

## Architecture & Single Source of Truth

This repository houses a **Manifest V3 Firefox extension** (`/extension/`) alongside a **React + Vite interactive sandbox and `.zip` packager** (`/src/`).

- **`/extension/` is the single source of truth** for the Firefox extension:
  - `extension/manifest.json` — Firefox MV3 manifest (`strict_min_version: "109.0"`).
  - `extension/background.js` — Non-persistent MV3 event page (context menus + `browser.theme.getCurrent()`).
  - `extension/content.js` — Right-click coordinate tracking, theme contrast guard, and Shadow DOM floating QR card.
  - `extension/qrcodegen.js` — Compiled ES2020 build of Project Nayuki’s MIT-licensed `qrcodegen.ts` (vendored; do not hand-edit).
  - `extension/icons/icon.svg` — Native Firefox SVG extension icon.
  - `extension/README.md` — End-user installation readme included inside the downloadable ZIP.
- **`src/lib/extensionFiles.ts`** imports all files from `/extension/` using Vite `?raw` imports. Never duplicate extension code as inline strings inside `src/`.
- **Sandbox parity**:
  - `src/lib/qrEncoder.ts` wraps `src/lib/vendor/qrcodegen.ts` (same Nayuki library as `extension/qrcodegen.js`, using `Ecc.MEDIUM` with `boostEcl = true` and fallback to `Ecc.LOW`).
  - `src/lib/themeResolver.ts` mirrors the exact WCAG luminance contrast guard in `extension/content.js`.
  - If you change popup layout, positioning, or theme contrast logic in `extension/content.js`, keep `src/components/FloatingQrCard.tsx` and `src/lib/themeResolver.ts` aligned.

## Non-Negotiable Product & Technical Invariants

1. **Firefox MV3 Event Page Rules (`extension/background.js`)**:
   - Keep `"background": { "scripts": ["background.js"] }` and `"browser_specific_settings": { "gecko": { ... } }` in `extension/manifest.json`.
   - Register `browser.runtime.onInstalled`, `browser.runtime.onStartup`, and `browser.contextMenus.onClicked` synchronously at the top level (never inside async callbacks).
   - Keep the `browser.scripting.executeScript` fallback so LinkQR works on tabs already open before installation.
2. **Context Menu Scope**:
   - Support three triggers: `link`, `selection`, and `page`.
3. **Minimal Floating QR Card**:
   - Anchor near the right-clicked link/cursor with viewport edge clamping (flipping above the link when near the bottom edge).
   - Keep the popup minimal and distraction-free: display only the scannable QR SVG (with mandatory 4-module quiet zone), a subtle truncated payload caption, and a quiet close button (`Esc` and outside click dismiss). Do not add action toolbars or extra buttons inside the popup unless explicitly requested.
   - Always render inside a Shadow DOM root at maximum z-index (`2147483647`) so host website CSS cannot break styling.
4. **Firefox Theme & QR Scannability Contrast Guard**:
   - Read active Firefox theme colors in `background.js` via `browser.theme.getCurrent(tab.windowId)` (content scripts cannot call the `theme` API directly) and pass them to `content.js`.
   - Never render inverted light-on-dark QR modules. Only use native theme colors for QR modules when `bgLum > 0.65`, `bgLum > fgLum`, and WCAG contrast ratio is `>= 7.0`. Otherwise keep the themed card frame and render the QR code on an inner `#FFFFFF` plate with `#111111` modules.
5. **Offline & Privacy Guarantee**:
   - Never introduce external QR APIs, analytics, or network requests inside `/extension/`.
6. **Vendored Files**:
   - Do not hand-edit `extension/qrcodegen.js` or `src/lib/vendor/qrcodegen.ts`. Both originate verbatim from `nayuki/QR-Code-generator` (`typescript-javascript/qrcodegen.ts`, MIT License).
7. **Playground Build & GitHub Pages CI**:
   - Keep `base: process.env.VITE_BASE_PATH || (command === 'build' ? './' : '/')` and `import.meta.dirname` (not `__dirname`) in `vite.config.ts` so production builds work at any GitHub Pages subpath with zero Vite 8 warnings.
   - Keep `jszip` (`src/lib/zipBuilder.ts`) and `ExtensionSourceViewer` (`src/App.tsx`) lazily imported so the main bundle stays under Vite’s 500 kB chunk warning threshold.
   - Keep `.github/workflows/deploy-pages.yml` working both with and without `package-lock.json` (`npm ci` when present, `npm install` otherwise), and avoid adding unused packages that create peer conflicts during clean CI installs.

## Verification Commands

Run all three commands after making changes (the GitHub Pages workflow runs all three automatically on pushes to `main`):

```bash
npm run verify:extension  # Checks manifest.json schema, referenced files, JS syntax, QR parity, and contrast guard
npm run lint              # TypeScript type-check (tsc --noEmit)
npm run build             # Vite production bundle (should finish with zero warnings)
```
