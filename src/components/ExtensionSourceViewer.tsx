import { useMemo, useState } from 'react';
import { Check, Copy, FileCode2, FileJson, FileText, Image } from 'lucide-react';
import { EXTENSION_FILES, ExtensionFile } from '../lib/extensionFiles';

function formatByteSize(text: string): string {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function FileIcon({ language }: { language: ExtensionFile['language'] }) {
  switch (language) {
    case 'json':
      return <FileJson className="h-4 w-4 shrink-0 text-slate-400" />;
    case 'svg':
      return <Image className="h-4 w-4 shrink-0 text-slate-400" />;
    case 'markdown':
      return <FileText className="h-4 w-4 shrink-0 text-slate-400" />;
    default:
      return <FileCode2 className="h-4 w-4 shrink-0 text-slate-400" />;
  }
}

export function ExtensionSourceViewer() {
  const [activePath, setActivePath] = useState<string>(EXTENSION_FILES[0].path);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const activeFile = useMemo(
    () => EXTENSION_FILES.find((f) => f.path === activePath) ?? EXTENSION_FILES[0],
    [activePath]
  );

  const lines = useMemo(() => activeFile.content.replace(/\n$/, '').split('\n'), [activeFile]);

  const totalSize = useMemo(() => {
    const totalBytes = EXTENSION_FILES.reduce(
      (sum, f) => sum + new TextEncoder().encode(f.content).length,
      0
    );
    return `${(totalBytes / 1024).toFixed(1)} KB`;
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedPath(activeFile.path);
      window.setTimeout(() => {
        setCopiedPath((prev) => (prev === activeFile.path ? null : prev));
      }, 2000);
    } catch {
      // Ignore clipboard failures on restricted environments
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Manifest V3 Extension Source
        </h1>
        <p className="text-sm text-slate-600">
          Every file packaged inside <span className="font-mono text-slate-800">linkqr-firefox-mv3.zip</span> —{' '}
          <span className="tabular-nums">{EXTENSION_FILES.length} files</span> ·{' '}
          <span className="tabular-nums">{totalSize}</span> uncompressed · zero external dependencies.
        </p>
      </div>

      <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-12">
        {/* File List Pane */}
        <div className="border-b border-slate-200 bg-slate-50/70 lg:col-span-4 lg:border-r lg:border-b-0 xl:col-span-3">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">
            Package Contents
          </div>
          <nav aria-label="Extension source files" className="divide-y divide-slate-200/70">
            {EXTENSION_FILES.map((file) => {
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
                    {formatByteSize(file.content)}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Code Display Pane */}
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
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {lines.length} lines
                </span>
                <span className="text-xs text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {formatByteSize(activeFile.content)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{activeFile.summary}</p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              {copiedPath === activeFile.path ? (
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
          </div>

          {activeFile.language === 'svg' && (
            <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50/50 px-5 py-4">
              <div
                className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1"
                dangerouslySetInnerHTML={{ __html: activeFile.content }}
              />
              <div className="text-xs text-slate-600">
                <div className="font-medium text-slate-900">Native Firefox SVG Icon</div>
                <p className="mt-0.5">
                  Firefox renders SVG icons cleanly across 48px, 96px, and 128px HiDPI surfaces
                  without needing raster PNG duplicates.
                </p>
              </div>
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
}
