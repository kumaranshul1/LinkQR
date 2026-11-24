#!/usr/bin/env node
/**
 * Builds ready-to-load unpacked extension directories from /extension/ using the
 * shared src/lib/extensionBundles.json manifest (single source of truth shared
 * with the playground ZIP packager and verifier):
 *   - dist-extension/firefox/
 *   - dist-extension/chromium-safari/
 */

import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const extDir = join(rootDir, 'extension');
const outRoot = join(rootDir, 'dist-extension');
const bundlesPath = join(rootDir, 'src', 'lib', 'extensionBundles.json');

const bundles = JSON.parse(readFileSync(bundlesPath, 'utf8'));

rmSync(outRoot, { recursive: true, force: true });

for (const [bundleName, entries] of Object.entries(bundles)) {
  const targetDir = join(outRoot, bundleName);
  for (const entry of entries) {
    const destPath = join(targetDir, entry.target);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(extDir, entry.source), destPath);
  }
  console.log(
    `✓ Packaged unpacked ${bundleName} extension -> dist-extension/${bundleName}/ (${entries.length} files)`
  );
}
