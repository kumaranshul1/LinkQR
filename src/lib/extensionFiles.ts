/**
 * Single source of truth for the packaged Manifest V3 Firefox extension files.
 * Imports the real files directly from /extension/ via Vite ?raw imports so the
 * Source Inspector and client-side ZIP packager always stay in sync with /extension/.
 */

import manifestJson from '../../extension/manifest.json?raw';
import backgroundJs from '../../extension/background.js?raw';
import contentJs from '../../extension/content.js?raw';
import qrcodegenJs from '../../extension/qrcodegen.js?raw';
import iconSvg from '../../extension/icons/icon.svg?raw';
import extensionReadme from '../../extension/README.md?raw';

export interface ExtensionFile {
  path: string;
  language: 'json' | 'javascript' | 'svg' | 'markdown';
  summary: string;
  content: string;
}

export const EXTENSION_FILES: readonly ExtensionFile[] = [
  {
    path: 'manifest.json',
    language: 'json',
    summary:
      'Manifest V3 definition targeting Firefox 109+ with Gecko ID, theme API permission, and MV3 event page.',
    content: manifestJson,
  },
  {
    path: 'background.js',
    language: 'javascript',
    summary:
      'Non-persistent MV3 event page registering link, selection, and page context menus and resolving active Firefox theme colors.',
    content: backgroundJs,
  },
  {
    path: 'content.js',
    language: 'javascript',
    summary:
      'Tracks right-click position, applies Firefox theme colors with a WCAG contrast guard, and renders the Shadow DOM floating QR card.',
    content: contentJs,
  },
  {
    path: 'qrcodegen.js',
    language: 'javascript',
    summary:
      'Official Project Nayuki QR Code generator (MIT License) compiled to ES2020 — supports Numeric/Alphanumeric/Byte modes and automatic ECC boosting.',
    content: qrcodegenJs,
  },
  {
    path: 'icons/icon.svg',
    language: 'svg',
    summary: 'Scalable vector extension icon supported natively by Firefox.',
    content: iconSvg,
  },
  {
    path: 'README.md',
    language: 'markdown',
    summary: 'Step-by-step instructions for temporary loading, permanent AMO signing, and MIT attribution.',
    content: extensionReadme,
  },
];
