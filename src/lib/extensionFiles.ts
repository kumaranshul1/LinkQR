/**
 * Single source of truth for the packaged Manifest V3 extension files across
 * Firefox and Chromium/Safari targets. Imports real files directly from /extension/.
 */

import firefoxManifestJson from '../../extension/manifest.json?raw';
import chromiumManifestJson from '../../extension/manifest.chromium.json?raw';
import backgroundJs from '../../extension/background.js?raw';
import contentJs from '../../extension/content.js?raw';
import qrcodegenJs from '../../extension/qrcodegen.js?raw';
import iconSvg from '../../extension/icons/icon.svg?raw';
import icon16Url from '../../extension/icons/icon-16.png';
import icon32Url from '../../extension/icons/icon-32.png';
import icon48Url from '../../extension/icons/icon-48.png';
import icon128Url from '../../extension/icons/icon-128.png';
import extensionReadme from '../../extension/README.md?raw';
import { ExtensionBundleId } from './browserTargets';

export interface ExtensionTextFile {
  kind: 'text';
  path: string;
  sourcePath?: string;
  language: 'json' | 'javascript' | 'svg' | 'markdown';
  summary: string;
  content: string;
}

export interface ExtensionBinaryFile {
  kind: 'binary';
  path: string;
  language: 'png';
  summary: string;
  assetUrl: string;
  dimensions: string;
  approxBytes: number;
}

export type ExtensionFile = ExtensionTextFile | ExtensionBinaryFile;

const SHARED_SCRIPT_FILES: readonly ExtensionTextFile[] = [
  {
    kind: 'text',
    path: 'background.js',
    language: 'javascript',
    summary:
      'Cross-browser MV3 event page / service worker with zero-dependency browser/chrome shim, context menus, optional Firefox theme resolution, and pure on-demand activeTab injection.',
    content: backgroundJs,
  },
  {
    kind: 'text',
    path: 'content.js',
    language: 'javascript',
    summary:
      'Injected on demand to render a Shadow DOM floating QR card using safe SVG DOM APIs (zero innerHTML), Firefox theme or OS light/dark contrast guard, and fresh right-click anchoring.',
    content: contentJs,
  },
  {
    kind: 'text',
    path: 'qrcodegen.js',
    language: 'javascript',
    summary:
      'Official Project Nayuki QR Code generator (MIT License) compiled to ES2020 — supports Numeric/Alphanumeric/Byte modes and automatic ECC boosting.',
    content: qrcodegenJs,
  },
];

const README_FILE: ExtensionTextFile = {
  kind: 'text',
  path: 'README.md',
  language: 'markdown',
  summary: 'Installation guide for Firefox, Chromium browsers, and Safari plus MIT attribution.',
  content: extensionReadme,
};

export const FIREFOX_EXTENSION_FILES: readonly ExtensionFile[] = [
  {
    kind: 'text',
    path: 'manifest.json',
    language: 'json',
    summary:
      'Firefox MV3 manifest (109+) with Gecko ID, theme API permission, SVG icon, and pure on-demand activeTab injection (no <all_urls> host permissions).',
    content: firefoxManifestJson,
  },
  ...SHARED_SCRIPT_FILES,
  {
    kind: 'text',
    path: 'icons/icon.svg',
    language: 'svg',
    summary: 'Scalable vector extension icon supported natively by Firefox.',
    content: iconSvg,
  },
  README_FILE,
];

export const CHROMIUM_SAFARI_EXTENSION_FILES: readonly ExtensionFile[] = [
  {
    kind: 'text',
    path: 'manifest.json',
    sourcePath: 'extension/manifest.chromium.json',
    language: 'json',
    summary:
      'W3C-standard MV3 manifest for Chrome, Edge, Brave, Opera, Vivaldi, Arc, and Safari (service_worker, raster PNG icons, and pure on-demand activeTab injection with zero <all_urls> permissions).',
    content: chromiumManifestJson,
  },
  ...SHARED_SCRIPT_FILES,
  {
    kind: 'binary',
    path: 'icons/icon-16.png',
    language: 'png',
    summary: '16×16 raster PNG icon for browser context menus and tabs.',
    assetUrl: icon16Url,
    dimensions: '16×16',
    approxBytes: 218,
  },
  {
    kind: 'binary',
    path: 'icons/icon-32.png',
    language: 'png',
    summary: '32×32 HiDPI toolbar and menu PNG icon.',
    assetUrl: icon32Url,
    dimensions: '32×32',
    approxBytes: 361,
  },
  {
    kind: 'binary',
    path: 'icons/icon-48.png',
    language: 'png',
    summary: '48×48 extension management page PNG icon.',
    assetUrl: icon48Url,
    dimensions: '48×48',
    approxBytes: 458,
  },
  {
    kind: 'binary',
    path: 'icons/icon-128.png',
    language: 'png',
    summary: '128×128 Chrome Web Store, Edge Add-ons, and Safari icon.',
    assetUrl: icon128Url,
    dimensions: '128×128',
    approxBytes: 1249,
  },
  README_FILE,
];

export function getExtensionFilesForBundle(bundleId: ExtensionBundleId): readonly ExtensionFile[] {
  return bundleId === 'firefox' ? FIREFOX_EXTENSION_FILES : CHROMIUM_SAFARI_EXTENSION_FILES;
}
