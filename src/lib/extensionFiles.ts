/**
 * Single source of truth for the packaged Manifest V3 extension files across
 * Firefox and Chromium/Safari targets. Bundle membership comes from
 * extensionBundles.json (shared with scripts/package-extension.mjs and
 * scripts/verify-extension.mjs) and imports real files directly from /extension/.
 */

import firefoxManifestJson from '../../extension/manifest.json?raw';
import chromiumManifestJson from '../../extension/manifest.chromium.json?raw';
import backgroundJs from '../../extension/background.js?raw';
import contentJs from '../../extension/content.js?raw';
import qrcodegenJs from '../../extension/qrcodegen.js?raw';
import iconSvg from '../../extension/icons/icon.svg?raw';
import iconSvgUrl from '../../extension/icons/icon.svg?url';
import icon16Url from '../../extension/icons/icon-16.png';
import icon32Url from '../../extension/icons/icon-32.png';
import icon48Url from '../../extension/icons/icon-48.png';
import icon128Url from '../../extension/icons/icon-128.png';
import extensionReadme from '../../extension/README.md?raw';
import extensionBundles from './extensionBundles.json';
import { ExtensionBundleId } from './browserTargets';

export interface ExtensionTextFile {
  kind: 'text';
  path: string;
  sourcePath?: string;
  language: 'json' | 'javascript' | 'svg' | 'markdown';
  summary: string;
  content: string;
  previewUrl?: string;
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

interface RawTextBundleEntry {
  source: string;
  target: string;
  kind: 'text';
  language: 'json' | 'javascript' | 'svg' | 'markdown';
  summary: string;
}

interface RawBinaryBundleEntry {
  source: string;
  target: string;
  kind: 'binary';
  language: 'png';
  dimensions: string;
  approxBytes: number;
  summary: string;
}

type RawBundleEntry = RawTextBundleEntry | RawBinaryBundleEntry;

const TEXT_ASSETS: Record<string, string> = {
  'manifest.json': firefoxManifestJson,
  'manifest.chromium.json': chromiumManifestJson,
  'background.js': backgroundJs,
  'content.js': contentJs,
  'qrcodegen.js': qrcodegenJs,
  'icons/icon.svg': iconSvg,
  'README.md': extensionReadme,
};

const TEXT_PREVIEW_URLS: Record<string, string> = {
  'icons/icon.svg': iconSvgUrl,
};

const BINARY_ASSETS: Record<string, string> = {
  'icons/icon-16.png': icon16Url,
  'icons/icon-32.png': icon32Url,
  'icons/icon-48.png': icon48Url,
  'icons/icon-128.png': icon128Url,
};

function resolveBundleEntries(entries: readonly RawBundleEntry[]): readonly ExtensionFile[] {
  return entries.map((entry): ExtensionFile => {
    if (entry.kind === 'binary') {
      const assetUrl = BINARY_ASSETS[entry.source];
      if (!assetUrl) {
        throw new Error(`Missing binary asset import for extension/${entry.source}`);
      }
      return {
        kind: 'binary',
        path: entry.target,
        language: entry.language,
        summary: entry.summary,
        assetUrl,
        dimensions: entry.dimensions,
        approxBytes: entry.approxBytes,
      };
    }

    const content = TEXT_ASSETS[entry.source];
    if (typeof content !== 'string') {
      throw new Error(`Missing text asset import for extension/${entry.source}`);
    }

    return {
      kind: 'text',
      path: entry.target,
      sourcePath: entry.source !== entry.target ? `extension/${entry.source}` : undefined,
      language: entry.language,
      summary: entry.summary,
      content,
      previewUrl: TEXT_PREVIEW_URLS[entry.source],
    };
  });
}

const rawBundles = extensionBundles as Record<ExtensionBundleId, readonly RawBundleEntry[]>;

export const FIREFOX_EXTENSION_FILES: readonly ExtensionFile[] = resolveBundleEntries(
  rawBundles.firefox
);

export const CHROMIUM_SAFARI_EXTENSION_FILES: readonly ExtensionFile[] = resolveBundleEntries(
  rawBundles['chromium-safari']
);

export function getExtensionFilesForBundle(bundleId: ExtensionBundleId): readonly ExtensionFile[] {
  return bundleId === 'firefox' ? FIREFOX_EXTENSION_FILES : CHROMIUM_SAFARI_EXTENSION_FILES;
}
