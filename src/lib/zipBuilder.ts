import { ExtensionBundleId, getZipFilename } from './browserTargets';

export async function downloadExtensionZip(bundleId: ExtensionBundleId): Promise<void> {
  const [{ default: JSZip }, { getExtensionFilesForBundle }] = await Promise.all([
    import('jszip'),
    import('./extensionFiles'),
  ]);

  const files = getExtensionFilesForBundle(bundleId);
  const zip = new JSZip();

  await Promise.all(
    files.map(async (file) => {
      if (file.kind === 'text') {
        zip.file(file.path, file.content);
      } else {
        const response = await fetch(file.assetUrl);
        const arrayBuffer = await response.arrayBuffer();
        zip.file(file.path, arrayBuffer);
      }
    })
  );

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = getZipFilename(bundleId);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
