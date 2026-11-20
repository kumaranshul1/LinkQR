/**
 * Wrapper around Project Nayuki's MIT-licensed QR Code generator library.
 * Uses optimal Numeric/Alphanumeric/Byte segmentation with free ECC boosting
 * (boostEcl = true) and automatic fallback from Medium to Low for very large payloads.
 */

import { qrcodegen } from './vendor/qrcodegen';

export type EccLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrResult {
  version: number;
  size: number;
  eccLevel: EccLevel;
  byteLength: number;
  qr: qrcodegen.QrCode;
}

function eccToLabel(ecc: qrcodegen.QrCode.Ecc): EccLevel {
  if (ecc === qrcodegen.QrCode.Ecc.HIGH) return 'H';
  if (ecc === qrcodegen.QrCode.Ecc.QUARTILE) return 'Q';
  if (ecc === qrcodegen.QrCode.Ecc.MEDIUM) return 'M';
  return 'L';
}

export function encodeQr(text: string): QrResult {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length === 0) {
    throw new Error('Cannot encode an empty string.');
  }

  const segs = qrcodegen.QrSegment.makeSegments(text);
  let qr: qrcodegen.QrCode;

  try {
    // Prefer Medium ECC (15%) and automatically boost to Q or H if space permits in the same version
    qr = qrcodegen.QrCode.encodeSegments(
      segs,
      qrcodegen.QrCode.Ecc.MEDIUM,
      qrcodegen.QrCode.MIN_VERSION,
      qrcodegen.QrCode.MAX_VERSION,
      -1,
      true
    );
  } catch {
    try {
      // Fallback to Low ECC (7%) for very long URLs or text selections
      qr = qrcodegen.QrCode.encodeSegments(
        segs,
        qrcodegen.QrCode.Ecc.LOW,
        qrcodegen.QrCode.MIN_VERSION,
        qrcodegen.QrCode.MAX_VERSION,
        -1,
        true
      );
    } catch {
      throw new Error(
        `Content (${bytes.length.toLocaleString()} bytes) exceeds maximum QR code capacity.`
      );
    }
  }

  return {
    version: qr.version,
    size: qr.size,
    eccLevel: eccToLabel(qr.errorCorrectionLevel),
    byteLength: bytes.length,
    qr,
  };
}

export function qrToSvgPath(result: QrResult, quietZone = 4): string {
  const parts: string[] = [];
  for (let y = 0; y < result.size; y++) {
    for (let x = 0; x < result.size; x++) {
      if (result.qr.getModule(x, y)) {
        parts.push(`M${x + quietZone},${y + quietZone}h1v1h-1z`);
      }
    }
  }
  return parts.join('');
}
