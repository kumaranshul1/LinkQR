export const EXTENSION_ZIP_FILENAME = 'linkqr-firefox-mv3.zip';

export async function downloadExtensionZip(): Promise<void> {
  const [{ default: JSZip }, { EXTENSION_FILES }] = await Promise.all([
    import('jszip'),
    import('./extensionFiles'),
  ]);

  const zip = new JSZip();
  for (const file of EXTENSION_FILES) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = EXTENSION_ZIP_FILENAME;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
