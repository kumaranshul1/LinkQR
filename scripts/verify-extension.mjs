/**
 * Automated verification script for the LinkQR Firefox Manifest V3 extension.
 * Run via: npm run verify:extension
 */

import fs from 'node:fs';
import path from 'node:path';
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

// 1. Validate extension/manifest.json structure and referenced files
const manifestPath = path.join(extDir, 'manifest.json');
assert(fs.existsSync(manifestPath), 'extension/manifest.json is missing');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert(manifest.manifest_version === 3, 'manifest_version must be 3');
assert(
  manifest.browser_specific_settings?.gecko?.id,
  'browser_specific_settings.gecko.id is required for Firefox'
);
assert(
  Array.isArray(manifest.background?.scripts) && manifest.background.scripts.length > 0,
  'background.scripts must be defined for Firefox MV3 event page'
);

for (const perm of ['contextMenus', 'activeTab', 'scripting', 'theme']) {
  assert(
    Array.isArray(manifest.permissions) && manifest.permissions.includes(perm),
    `Missing required permission: ${perm}`
  );
}

const referencedFiles = new Set([
  ...(manifest.background?.scripts ?? []),
  ...(manifest.content_scripts ?? []).flatMap((cs) => cs.js ?? []),
  ...Object.values(manifest.icons ?? {}),
]);

for (const relPath of referencedFiles) {
  const fullPath = path.join(extDir, relPath);
  assert(fs.existsSync(fullPath), `Manifest references missing file: extension/${relPath}`);
}

// 2. Verify JS syntax of all extension scripts
for (const jsFile of ['background.js', 'content.js', 'qrcodegen.js']) {
  const src = fs.readFileSync(path.join(extDir, jsFile), 'utf8');
  new Function(src);
}

// 3. Verify Nayuki qrcodegen.js parity with TypeScript sandbox wrapper and boostEcl
const qrcodegenSrc = fs.readFileSync(path.join(extDir, 'qrcodegen.js'), 'utf8');
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
  { label: 'wifi', text: 'WIFI:T:WPA;S:StudioGuest;P:firefox-handoff-2026;;' },
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

// Oversized payload should throw cleanly
let threwOnOversize = false;
try {
  encodeQr('a'.repeat(4000));
} catch {
  threwOnOversize = true;
}
assert(threwOnOversize, 'Expected encodeQr to reject oversized payloads');

// 4. Verify Firefox theme contrast guard
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

console.log(
  `✓ LinkQR extension verified (${referencedFiles.size} manifest assets, ${testPayloads.length} QR vectors, ${FIREFOX_THEME_PRESETS.length} Firefox themes)`
);
