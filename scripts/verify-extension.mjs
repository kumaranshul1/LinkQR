/**
 * Automated verification script for the cross-browser LinkQR Manifest V3 extension
 * (Firefox, Chrome/Edge/Brave/Chromium, and Safari).
 * Run via: npm run verify:extension
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { encodeQr, qrToSvgPath } from '../src/lib/qrEncoder.ts';
import { FIREFOX_THEME_PRESETS, resolveCardTheme } from '../src/lib/themeResolver.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const extDir = path.join(rootDir, 'extension');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Verification failed: ${message}`);
  }
}

function assertValidPng(filePath, expectedSize) {
  const buf = fs.readFileSync(filePath);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < sig.length; i++) {
    assert(buf[i] === sig[i], `Invalid PNG signature in ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert(
    width === expectedSize && height === expectedSize,
    `Expected ${expectedSize}x${expectedSize} PNG in ${filePath}, got ${width}x${height}`
  );
}

// 1A. Validate Firefox MV3 manifest (extension/manifest.json)
const firefoxManifestPath = path.join(extDir, 'manifest.json');
assert(fs.existsSync(firefoxManifestPath), 'extension/manifest.json is missing');
const firefoxManifest = JSON.parse(fs.readFileSync(firefoxManifestPath, 'utf8'));

assert(firefoxManifest.manifest_version === 3, 'Firefox manifest_version must be 3');
assert(
  firefoxManifest.browser_specific_settings?.gecko?.id === 'linkqr@kumaranshul1.github.io',
  'browser_specific_settings.gecko.id must be linkqr@kumaranshul1.github.io'
);
assert(
  !firefoxManifest.content_scripts && !firefoxManifest.host_permissions,
  'Firefox manifest must use pure on-demand activeTab injection (no static content_scripts or host_permissions)'
);
assert(
  Array.isArray(firefoxManifest.background?.scripts) &&
    firefoxManifest.background.scripts.length > 0,
  'background.scripts must be defined for Firefox MV3 event page'
);

for (const perm of ['contextMenus', 'activeTab', 'scripting', 'theme']) {
  assert(
    Array.isArray(firefoxManifest.permissions) && firefoxManifest.permissions.includes(perm),
    `Firefox manifest missing required permission: ${perm}`
  );
}

// 1B. Validate Chromium & Safari MV3 manifest (extension/manifest.chromium.json)
const chromiumManifestPath = path.join(extDir, 'manifest.chromium.json');
assert(fs.existsSync(chromiumManifestPath), 'extension/manifest.chromium.json is missing');
const chromiumManifest = JSON.parse(fs.readFileSync(chromiumManifestPath, 'utf8'));

assert(chromiumManifest.manifest_version === 3, 'Chromium/Safari manifest_version must be 3');
assert(
  chromiumManifest.background?.service_worker === 'background.js',
  'Chromium/Safari manifest must declare background.service_worker'
);
assert(
  !chromiumManifest.content_scripts && !chromiumManifest.host_permissions,
  'Chromium/Safari manifest must use pure on-demand activeTab injection (no static content_scripts or host_permissions)'
);
assert(
  !chromiumManifest.background?.scripts,
  'Chromium/Safari manifest must not include Firefox-only background.scripts'
);
assert(
  !chromiumManifest.browser_specific_settings,
  'Chromium/Safari manifest must not include Firefox-only browser_specific_settings'
);
assert(
  !chromiumManifest.permissions?.includes('theme'),
  'Chromium/Safari manifest must not request Firefox-only theme permission'
);
for (const perm of ['contextMenus', 'activeTab', 'scripting']) {
  assert(
    Array.isArray(chromiumManifest.permissions) && chromiumManifest.permissions.includes(perm),
    `Chromium/Safari manifest missing required permission: ${perm}`
  );
}

for (const size of [16, 32, 48, 128]) {
  const relIcon = chromiumManifest.icons?.[String(size)];
  assert(relIcon && relIcon.endsWith('.png'), `Chromium/Safari manifest missing ${size}px PNG icon`);
  assertValidPng(path.join(extDir, relIcon), size);
}

const referencedFiles = new Set([
  ...(firefoxManifest.background?.scripts ?? []),
  ...Object.values(firefoxManifest.icons ?? {}),
  chromiumManifest.background?.service_worker,
  ...Object.values(chromiumManifest.icons ?? {}),
  'qrcodegen.js',
  'content.js',
]);

for (const relPath of referencedFiles) {
  const fullPath = path.join(extDir, relPath);
  assert(fs.existsSync(fullPath), `Extension references missing file: extension/${relPath}`);
}

// 2. Verify JS syntax & AMO safety rules (no innerHTML in content.js)
const backgroundSrc = fs.readFileSync(path.join(extDir, 'background.js'), 'utf8');
const contentSrc = fs.readFileSync(path.join(extDir, 'content.js'), 'utf8');
const qrcodegenSrc = fs.readFileSync(path.join(extDir, 'qrcodegen.js'), 'utf8');
assert(
  !/\binnerHTML\b/.test(contentSrc),
  'extension/content.js must not use innerHTML (use createElementNS for AMO linter compliance)'
);
new Function(backgroundSrc);
new Function(contentSrc);
new Function(qrcodegenSrc);

// 3. Exercise background.js in both mocked Firefox (browser.*) and Chromium (chrome.*) runtimes
async function testBackgroundRuntime(mode) {
  const createdMenus = [];
  const sentMessages = [];
  const injectedTabs = [];
  let onInstalledCb = null;
  let onClickedCb = null;
  let firstSendShouldFail = true;

  const runtimeApi = {
    lastError: null,
    onInstalled: { addListener: (cb) => (onInstalledCb = cb) },
    onStartup: { addListener: () => {} },
  };

  const contextMenusApi =
    mode === 'firefox'
      ? {
          removeAll: () => Promise.resolve(),
          create: (props) => createdMenus.push(props),
          onClicked: { addListener: (cb) => (onClickedCb = cb) },
        }
      : {
          removeAll: (cb) => cb(),
          create: (props, cb) => {
            createdMenus.push(props);
            if (cb) cb();
          },
          onClicked: { addListener: (cb) => (onClickedCb = cb) },
        };

  const tabsApi =
    mode === 'firefox'
      ? {
          sendMessage: (tabId, msg) => {
            if (firstSendShouldFail) {
              firstSendShouldFail = false;
              return Promise.reject(new Error('No receiving end'));
            }
            sentMessages.push({ tabId, msg });
            return Promise.resolve();
          },
        }
      : {
          sendMessage: (tabId, msg, cb) => {
            if (firstSendShouldFail) {
              firstSendShouldFail = false;
              runtimeApi.lastError = { message: 'Could not establish connection' };
              cb();
              runtimeApi.lastError = null;
              return;
            }
            sentMessages.push({ tabId, msg });
            cb({ ok: true });
          },
        };

  const scriptingApi = {
    executeScript: async ({ target, files }) => {
      injectedTabs.push({ tabId: target.tabId, files });
    },
  };

  const apiObj = {
    runtime: runtimeApi,
    contextMenus: contextMenusApi,
    tabs: tabsApi,
    scripting: scriptingApi,
    ...(mode === 'firefox'
      ? {
          theme: {
            getCurrent: async () => ({ colors: { popup: '#2B2A33', popup_text: '#FBFBFE' } }),
          },
        }
      : {}),
  };

  const sandbox = {
    console,
    Promise,
    ...(mode === 'firefox' ? { browser: apiObj } : { chrome: apiObj }),
  };
  sandbox.globalThis = sandbox;

  vm.runInNewContext(backgroundSrc, sandbox);
  assert(typeof onInstalledCb === 'function', `${mode}: onInstalled listener not registered`);
  assert(typeof onClickedCb === 'function', `${mode}: contextMenus.onClicked not registered`);

  onInstalledCb();
  await new Promise((r) => setTimeout(r, 10));
  assert(createdMenus.length === 3, `${mode}: expected 3 context menu items, got ${createdMenus.length}`);

  await onClickedCb(
    { menuItemId: 'linkqr-show-link', linkUrl: 'https://example.org/test' },
    { id: 42, windowId: 7, url: 'https://example.org' }
  );

  assert(injectedTabs.length === 1, `${mode}: on-demand scripting injection did not trigger`);
  assert(sentMessages.length === 1, `${mode}: message not delivered after on-demand injection`);
  assert(sentMessages[0].msg.payload === 'https://example.org/test', `${mode}: payload mismatch`);
  if (mode === 'firefox') {
    assert(sentMessages[0].msg.themeColors?.popup === '#2B2A33', 'firefox: themeColors missing');
  } else {
    assert(sentMessages[0].msg.themeColors === null, 'chromium: themeColors should be null');
  }

  // Second trigger on the same tab should reuse the injected script without re-injecting
  await onClickedCb(
    { menuItemId: 'linkqr-show-selection', selectionText: '  hello-qr  ' },
    { id: 42, windowId: 7, url: 'https://example.org' }
  );
  assert(injectedTabs.length === 1, `${mode}: should not re-inject on subsequent clicks`);
  assert(sentMessages.length === 2, `${mode}: second message not delivered directly`);
  assert(sentMessages[1].msg.payload === 'hello-qr', `${mode}: selection text not trimmed`);
}

await testBackgroundRuntime('firefox');
await testBackgroundRuntime('chromium');

// 4. Verify Nayuki qrcodegen.js parity with TypeScript sandbox wrapper and boostEcl
new Function(qrcodegenSrc)();
const QRC = globalThis.qrcodegen?.QrCode;
const QSeg = globalThis.qrcodegen?.QrSegment;
assert(QRC && QSeg, 'extension/qrcodegen.js did not expose globalThis.qrcodegen');

const testPayloads = [
  { label: 'numeric', text: '12345678901234567890', expectBoosted: true },
  { label: 'alphanumeric', text: 'HTTPS://MOZILLA.ORG/FIREFOX', expectBoosted: true },
  {
    label: 'url',
    text: 'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions',
  },
  { label: 'wifi', text: 'WIFI:T:WPA;S:StudioGuest;P:linkqr-handoff-2026;;' },
  { label: 'utf8', text: 'https://example.org/search?q=' + 'café-日本語-'.repeat(25) },
  { label: 'large-fallback-L', text: 'x'.repeat(2400) },
];

for (const { label, text, expectBoosted } of testPayloads) {
  const tsRes = encodeQr(text);
  const segs = QSeg.makeSegments(text);
  let jsQr;
  try {
    jsQr = QRC.encodeSegments(segs, QRC.Ecc.MEDIUM, QRC.MIN_VERSION, QRC.MAX_VERSION, -1, true);
  } catch {
    jsQr = QRC.encodeSegments(segs, QRC.Ecc.LOW, QRC.MIN_VERSION, QRC.MAX_VERSION, -1, true);
  }

  assert(tsRes.version === jsQr.version, `Version mismatch on ${label}`);
  assert(tsRes.size === jsQr.size, `Size mismatch on ${label}`);
  if (expectBoosted) {
    assert(
      tsRes.eccLevel === 'Q' || tsRes.eccLevel === 'H',
      `Expected boostEcl upgrade to Q or H for ${label}, got ${tsRes.eccLevel}`
    );
  }

  const tsPath = qrToSvgPath(tsRes, 4);
  const jsParts = [];
  for (let y = 0; y < jsQr.size; y++) {
    for (let x = 0; x < jsQr.size; x++) {
      if (jsQr.getModule(x, y)) jsParts.push(`M${x + 4},${y + 4}h1v1h-1z`);
    }
  }
  assert(tsPath === jsParts.join(''), `SVG path mismatch on ${label}`);
}

let threwOnOversize = false;
try {
  encodeQr('a'.repeat(4000));
} catch {
  threwOnOversize = true;
}
assert(threwOnOversize, 'Expected encodeQr to reject oversized payloads');

// 5. Verify Firefox theme & Chromium/Safari OS light/dark contrast guard
for (const preset of FIREFOX_THEME_PRESETS) {
  const resolved = resolveCardTheme(preset.colors, preset.isDarkChrome);
  assert(resolved.contrastRatio >= 7.0, `Contrast too low for ${preset.name}`);
  if (preset.isDarkChrome) {
    assert(
      resolved.usedContrastPlate && resolved.qrBg === '#FFFFFF',
      `Dark theme ${preset.name} must use white scan plate`
    );
  } else {
    assert(!resolved.usedContrastPlate, `Light theme ${preset.name} should use native theme ink`);
  }
}

const osLight = resolveCardTheme(null, false);
const osDark = resolveCardTheme(null, true);
assert(!osLight.usedContrastPlate && osLight.contrastRatio >= 7.0, 'OS Light must use native contrast');
assert(osDark.usedContrastPlate && osDark.qrBg === '#FFFFFF', 'OS Dark must use white scan plate');

console.log(
  `✓ LinkQR cross-browser extension verified (2 manifests, ${referencedFiles.size} assets, Firefox & Chromium runtimes, ${testPayloads.length} QR vectors, ${FIREFOX_THEME_PRESETS.length} Firefox themes + OS light/dark)`
);
