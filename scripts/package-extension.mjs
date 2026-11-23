#!/usr/bin/env node
/**
 * Builds ready-to-load unpacked extension directories from /extension/:
 *   - dist-extension/firefox/          (uses extension/manifest.json + icon.svg)
 *   - dist-extension/chromium-safari/  (copies extension/manifest.chromium.json -> manifest.json + PNG icons)
 */

import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const extDir = join(rootDir, 'extension');
const outRoot = join(rootDir, 'dist-extension');

const SHARED_FILES = ['background.js', 'content.js', 'qrcodegen.js', 'README.md'];

const TARGETS = [
  {
    name: 'firefox',
    files: [
      ['manifest.json', 'manifest.json'],
      ['icons/icon.svg', 'icons/icon.svg'],
      ...SHARED_FILES.map((f) => [f, f]),
    ],
  },
  {
    name: 'chromium-safari',
    files: [
      ['manifest.chromium.json', 'manifest.json'],
      ['icons/icon-16.png', 'icons/icon-16.png'],
      ['icons/icon-32.png', 'icons/icon-32.png'],
      ['icons/icon-48.png', 'icons/icon-48.png'],
      ['icons/icon-128.png', 'icons/icon-128.png'],
      ...SHARED_FILES.map((f) => [f, f]),
    ],
  },
];

rmSync(outRoot, { recursive: true, force: true });

for (const target of TARGETS) {
  const targetDir = join(outRoot, target.name);
  for (const [srcRel, destRel] of target.files) {
    const destPath = join(targetDir, destRel);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(extDir, srcRel), destPath);
  }
  console.log(`✓ Packaged unpacked ${target.name} extension -> dist-extension/${target.name}/ (${target.files.length} files)`);
}
