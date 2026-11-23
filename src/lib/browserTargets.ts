export type BrowserTarget = 'firefox' | 'chromium' | 'safari';

export type ExtensionBundleId = 'firefox' | 'chromium-safari';

export interface BrowserTargetMeta {
  id: BrowserTarget;
  label: string;
  shortLabel: string;
  bundleId: ExtensionBundleId;
  zipFilename: string;
  downloadLabel: string;
  engineSummary: string;
  themeCapability: string;
}

export const BROWSER_TARGETS: Record<BrowserTarget, BrowserTargetMeta> = {
  firefox: {
    id: 'firefox',
    label: 'Firefox',
    shortLabel: 'Firefox',
    bundleId: 'firefox',
    zipFilename: 'linkqr-firefox-mv3.zip',
    downloadLabel: 'Download Firefox (.zip)',
    engineSummary: 'Firefox 109+ · Event Page · Gecko ID',
    themeCapability: 'Reads active Firefox theme via browser.theme.getCurrent()',
  },
  chromium: {
    id: 'chromium',
    label: 'Chrome / Edge',
    shortLabel: 'Chrome / Edge',
    bundleId: 'chromium-safari',
    zipFilename: 'linkqr-chromium-safari-mv3.zip',
    downloadLabel: 'Download Chromium (.zip)',
    engineSummary: 'Chrome, Edge, Brave, Opera, Vivaldi · Service Worker',
    themeCapability: 'Matches browser/OS appearance via prefers-color-scheme',
  },
  safari: {
    id: 'safari',
    label: 'Safari',
    shortLabel: 'Safari',
    bundleId: 'chromium-safari',
    zipFilename: 'linkqr-chromium-safari-mv3.zip',
    downloadLabel: 'Download Safari Source (.zip)',
    engineSummary: 'Safari 15.4+ · Service Worker · Xcode Converter',
    themeCapability: 'Matches macOS/iOS appearance via prefers-color-scheme',
  },
};

export const BROWSER_TARGET_LIST: readonly BrowserTargetMeta[] = [
  BROWSER_TARGETS.firefox,
  BROWSER_TARGETS.chromium,
  BROWSER_TARGETS.safari,
];

export function getZipFilename(bundleId: ExtensionBundleId): string {
  return bundleId === 'firefox' ? 'linkqr-firefox-mv3.zip' : 'linkqr-chromium-safari-mv3.zip';
}
