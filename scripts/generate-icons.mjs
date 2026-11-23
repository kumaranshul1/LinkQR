/**
 * Deterministic zero-dependency PNG generator for LinkQR extension icons
 * (16, 32, 48, 128px) matching extension/icons/icon.svg.
 * Run via: node scripts/generate-icons.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, '../extension/icons');

const SIZES = [16, 32, 48, 128];

const COLORS = {
  bg: [0x0f, 0x17, 0x2a, 255], // #0F172A
  white: [0xff, 0xff, 0xff, 255], // #FFFFFF
  accent: [0xe8, 0x5d, 0x2a, 255], // #E85D2A
  transparent: [0, 0, 0, 0],
};

function pointInRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function sampleSvgAt(u, v) {
  // Coordinates in the 96x96 viewBox of extension/icons/icon.svg
  if (!pointInRoundedRect(u, v, 0, 0, 96, 96, 22)) {
    return COLORS.transparent;
  }

  // Three QR finder frames (outer stroked rect x/y/24/24, strokeWidth=6 -> outer 30x30, inner 18x18)
  const finders = [
    [18, 18],
    [54, 18],
    [18, 54],
  ];
  for (const [fx, fy] of finders) {
    const inOuter = pointInRoundedRect(u, v, fx - 3, fy - 3, 30, 30, 6);
    const inHole = pointInRoundedRect(u, v, fx + 3, fy + 3, 18, 18, 2);
    if (inOuter && !inHole) return COLORS.white;
    if (pointInRoundedRect(u, v, fx + 9, fy + 9, 6, 6, 1)) return COLORS.white;
  }

  // Bottom-right 2x2 data blocks (orange + white)
  if (pointInRoundedRect(u, v, 54, 54, 10, 10, 2)) return COLORS.accent;
  if (pointInRoundedRect(u, v, 68, 54, 10, 10, 2)) return COLORS.white;
  if (pointInRoundedRect(u, v, 54, 68, 10, 10, 2)) return COLORS.white;
  if (pointInRoundedRect(u, v, 68, 68, 10, 10, 2)) return COLORS.accent;

  return COLORS.bg;
}

function renderRgba(size) {
  const buf = Buffer.alloc(size * size * 4);
  const subSamples = 4; // 4x4 supersampling for crisp anti-aliased edges
  const invTotal = 1 / (subSamples * subSamples);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      let aAcc = 0;

      for (let sy = 0; sy < subSamples; sy++) {
        for (let sx = 0; sx < subSamples; sx++) {
          const u = ((x + (sx + 0.5) / subSamples) / size) * 96;
          const v = ((y + (sy + 0.5) / subSamples) / size) * 96;
          const [r, g, b, a] = sampleSvgAt(u, v);
          const alphaFrac = a / 255;
          rAcc += r * alphaFrac;
          gAcc += g * alphaFrac;
          bAcc += b * alphaFrac;
          aAcc += alphaFrac;
        }
      }

      const idx = (y * size + x) * 4;
      const outA = aAcc * invTotal;
      if (outA > 0) {
        buf[idx] = Math.round(rAcc / aAcc);
        buf[idx + 1] = Math.round(gAcc / aAcc);
        buf[idx + 2] = Math.round(bAcc / aAcc);
        buf[idx + 3] = Math.round(outA * 255);
      }
    }
  }
  return buf;
}

// Standard CRC32 table for PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type None
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(iconsDir, { recursive: true });
for (const size of SIZES) {
  const rgba = renderRgba(size);
  const png = encodePng(size, size, rgba);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated extension/icons/icon-${size}.png (${png.length} bytes)`);
}
