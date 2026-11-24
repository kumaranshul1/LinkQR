import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, FileCode2, FileJson, FileText, Image } from 'lucide-react';
import {
  BROWSER_TARGETS,
  BrowserTarget,
  ExtensionBundleId,
  getZipFilename,
} from '../lib/browserTargets';
import { ExtensionFile, getExtensionFilesForBundle } from '../lib/extensionFiles';

interface ExtensionSourceViewerProps {
  browserTarget: BrowserTarget;
  onBrowserTargetChange: (target: BrowserTarget) => void;
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getFileBytes(file: ExtensionFile): number {
  if (file.kind === 'binary') return file.approxBytes;
  return new TextEncoder().encode(file.content).length;
}

function FileIcon({ language }: { language: ExtensionFile['language'] }) {
  switch (language) {
    case 'json':
      return <FileJson className="h-4 w-4 shrink-0 text-slate-400" />;
    case 'svg':
    case 'png':
      return <Image className="h-4 w-4 shrink-0 text-slate-400" />;
    case 'markdown':
      return <FileText className="h-4 w-4 shrink-0 text-slate-400" />;
    default:
      return <FileCode2 className="h-4 w-4 shrink-0 text-slate-400" />;
  }
}

export function ExtensionSourceViewer({
  browserTarget,
  onBrowserTargetChange,
}: ExtensionSourceViewerProps) {
  const activeBundleId: ExtensionBundleId = BROWSER_TARGETS[browserTarget].bundleId;
  const files = useMemo(() => getExtensionFilesForBundle(activeBundleId), [activeBundleId]);

  const [activePath, setActivePath] = useState<string>('manifest.json');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!files.some((f) => f.path === activePath)) {
      setActivePath(files[0].path);
    }
  }, [files, activePath]);

  const activeFile = useMemo(
    () => files.find((f) => f.path === activePath) ?? files[0],
    [files, activePath]
  );

  const lines = useMemo(
    () => (activeFile.kind === 'text' ? activeFile.content.replace(/\n$/, '').split('\n') : []),
    [activeFile]
  );

  const totalSize = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + getFileBytes(f), 0);
    return `${(totalBytes / 1024).toFixed(1)} KB`;
  }, [files]);

  const handleCopy = async () => {
    if (activeFile.kind !== 'text') return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedPath(`${activeBundleId}:${activeFile.path}`);
      window.setTimeout(() => {
        setCopiedPath((prev) => (prev === `${activeBundleId}:${activeFile.path}` ? null : prev));
      }, 2000);
    } catch {
      // Ignore clipboard failures on restricted environments
    }
  };

  const zipName = getZipFilename(activeBundleId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manifest V3 Extension Source
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every file packaged inside <span className="font-mono text-slate-800">{zipName}</span> —{' '}
            <span className="tabular-nums">{files.length} files</span> ·{' '}
            <span className="tabular-nums">{totalSize}</span> uncompressed · shared core scripts.
          </p>
        </div>

        {/* Bundle Target Toggle */}
        <div
          className="flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-white p-1 lg:self-auto"
          role="group"
          aria-label="Extension package target"
        >
          <button
            type="button"
            onClick={() => onBrowserTargetChange('firefox')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              activeBundleId === 'firefox'
                ? 'bg-[#E85D2A] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Firefox MV3
          </button>
          <button
            type="button"
            onClick={() =>
              onBrowserTargetChange(browserTarget === 'safari' ? 'safari' : 'chromium')
            }
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              activeBundleId === 'chromium-safari'
                ? 'bg-[#E85D2A] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Chrome, Edge &amp; Safari MV3
          </button>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-12">
        {/* File List Pane */}
        <div className="border-b border-slate-200 bg-slate-50/70 lg:col-span-4 lg:border-r lg:border-b-0 xl:col-span-3">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">
            Package Contents
          </div>
          <nav aria-label="Extension source files" className="divide-y divide-slate-200/70">
            {files.map((file) => {
              const isSelected = file.path === activeFile.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setActivePath(file.path)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-white text-slate-900'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <FileIcon language={file.language} />
                    <span
                      className={`truncate font-mono text-xs ${
                        isSelected ? 'font-medium text-[#E85D2A]' : 'text-slate-800'
                      }`}
                    >
                      {file.path}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400 tabular-nums">
                    {formatByteSize(getFileBytes(file))}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Code / Asset Display Pane */}
        <div className="flex min-w-0 flex-col lg:col-span-8 xl:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-slate-900">
                  {activeFile.path}
                </span>
                <span className="text-xs text-slate-400" aria-hidden="true">
                  ·
                </span>
                {activeFile.kind === 'text' ? (
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {lines.length} lines
                  </span>
                ) : (
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {activeFile.dimensions} PNG
                  </span>
                )}
                <span className="text-xs text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {formatByteSize(getFileBytes(activeFile))}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{activeFile.summary}</p>
              {activeFile.kind === 'text' && activeFile.sourcePath && (
                <p className="mt-1 text-xs text-slate-500">
                  Packaged from{' '}
                  <span className="font-mono text-slate-700">{activeFile.sourcePath}</span> as{' '}
                  <span className="font-mono text-slate-700">{activeFile.path}</span> inside{' '}
                  <span className="font-mono text-slate-700">{zipName}</span>.
                </p>
              )}
            </div>

            {activeFile.kind === 'text' && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                {copiedPath === `${activeBundleId}:${activeFile.path}` ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    Copy File
                  </>
                )}
              </button>
            )}
          </div>

          {activeFile.kind === 'text' && activeFile.language === 'svg' && activeFile.previewUrl && (
            <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50/50 px-5 py-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
                <img
                  src={activeFile.previewUrl}
                  alt="LinkQR native SVG icon"
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-xs text-slate-600">
                <div className="font-medium text-slate-900">Native Firefox SVG Icon</div>
                <p className="mt-0.5">
                  Firefox renders SVG icons cleanly across 48px, 96px, and 128px HiDPI surfaces.
                  Chromium and Safari packages include raster PNG icons instead.
                </p>
              </div>
            </div>
          )}

          {activeFile.kind === 'binary' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-slate-50/60 px-6 py-16">
              <div className="flex items-center gap-6">
                <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
                  <img
                    src={activeFile.assetUrl}
                    alt={`LinkQR ${activeFile.dimensions} PNG icon`}
                    className="h-24 w-24 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="font-mono text-sm font-medium text-slate-900">
                    {activeFile.path}
                  </div>
                  <div className="tabular-nums">
                    Dimensions: {activeFile.dimensions} px · {formatByteSize(activeFile.approxBytes)}
                  </div>
                  <p className="max-w-xs pt-1 text-slate-500">
                    Lossless RGBA PNG packaged directly inside{' '}
                    <span className="font-mono text-slate-700">{zipName}</span> for Chromium and
                    Safari manifest compatibility.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto bg-[#0F172A] px-4 py-4 font-mono text-xs leading-relaxed text-slate-200">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03]">
                      <td className="w-10 pr-4 text-right align-top text-slate-500 select-none tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="whitespace-pre text-slate-100">{line || ' '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
