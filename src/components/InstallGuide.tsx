import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { EXTENSION_ZIP_FILENAME } from '../lib/zipBuilder';

interface InstallGuideProps {
  onDownload: () => Promise<void>;
  downloadState: 'idle' | 'downloading' | 'done';
}

const PERMISSIONS_LIST = [
  {
    name: 'contextMenus',
    scope: 'Right-click menus',
    reason: 'Adds "Show QR Code" entries when you right-click links, highlighted text, or pages.',
  },
  {
    name: 'theme',
    scope: 'Active Firefox theme',
    reason:
      'Reads your current Firefox theme colors (popup, popup_text, popup_border) via browser.theme.getCurrent() so the card matches your browser.',
  },
  {
    name: 'activeTab',
    scope: 'Invoked tab only',
    reason: 'Grants temporary access to display the floating QR card on the tab where you right-clicked.',
  },
  {
    name: 'scripting',
    scope: 'Fallback injection',
    reason: 'Ensures LinkQR works immediately on tabs that were already open before you loaded the extension.',
  },
];

export function InstallGuide({ onDownload, downloadState }: InstallGuideProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyDebuggingUrl = async () => {
    try {
      await navigator.clipboard.writeText('about:debugging#/runtime/this-firefox');
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Install LinkQR in Firefox
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Load the Manifest V3 package directly in Firefox 109 or newer in under a minute.
          </p>
        </div>

        <button
          type="button"
          onClick={onDownload}
          disabled={downloadState === 'downloading'}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E85D2A] px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-[#D14F20] disabled:opacity-60"
        >
          {downloadState === 'done' ? (
            <>
              <Check className="h-4 w-4" />
              Downloaded {EXTENSION_ZIP_FILENAME}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download Extension (.zip)
            </>
          )}
        </button>
      </div>

      {/* Section 1: Temporary Load */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            01. Quick Load for Immediate Use
          </h2>
          <span className="text-xs text-slate-500">
            No Mozilla account required · Active until Firefox restarts
          </span>
        </div>

        <ol className="mt-5 space-y-4 text-sm text-slate-700">
          <li className="flex gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
              1
            </span>
            <div>
              Download <span className="font-mono text-xs text-slate-900">{EXTENSION_ZIP_FILENAME}</span>{' '}
              and unzip it to a local folder on your computer.
            </div>
          </li>

          <li className="flex gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
              2
            </span>
            <div className="space-y-2">
              <div>Open a new tab in Firefox and navigate to the add-on debugging page:</div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-900">
                  about:debugging#/runtime/this-firefox
                </code>
                <button
                  type="button"
                  onClick={handleCopyDebuggingUrl}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>
          </li>

          <li className="flex gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
              3
            </span>
            <div>
              Click <span className="font-medium text-slate-900">Load Temporary Add-on…</span> and
              select <span className="font-mono text-xs text-slate-900">manifest.json</span> inside
              the extracted folder.
            </div>
          </li>

          <li className="flex gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
              4
            </span>
            <div>
              Right-click any link, highlighted text, or webpage background and choose{' '}
              <span className="font-medium text-slate-900">Show QR Code</span>. Press{' '}
              <span className="font-mono text-xs text-slate-900">Esc</span> or click outside the
              floating card to dismiss it.
            </div>
          </li>
        </ol>
      </section>

      {/* Section 2: Permanent Install */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            02. Permanent Installation (Signed .xpi)
          </h2>
          <span className="text-xs text-slate-500">
            Persists across restarts on standard Firefox Release
          </span>
        </div>

        <ol className="mt-5 space-y-3.5 text-sm text-slate-700">
          <li className="flex gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
              1
            </span>
            <div>
              Sign in at{' '}
              <span className="font-mono text-xs text-slate-900">
                addons.mozilla.org/developers/
              </span>{' '}
              and click <span className="font-medium text-slate-900">Submit a New Add-on</span>.
            </div>
          </li>
          <li className="flex gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
              2
            </span>
            <div>
              Choose <span className="font-medium text-slate-900">On your own</span> (private
              self-distribution) and upload{' '}
              <span className="font-mono text-xs text-slate-900">{EXTENSION_ZIP_FILENAME}</span>{' '}
              directly without unzipping.
            </div>
          </li>
          <li className="flex gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
              3
            </span>
            <div>
              Mozilla automatically signs the package within a minute—download the resulting{' '}
              <span className="font-mono text-xs text-slate-900">.xpi</span> file and drag it onto
              any Firefox window to install permanently.
            </div>
          </li>
        </ol>
      </section>

      {/* Section 3: Permissions Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">03. Manifest V3 Permissions</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            All QR encoding runs locally inside Firefox—no network requests or external APIs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Permission</th>
                <th className="px-6 py-3">Scope</th>
                <th className="px-6 py-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {PERMISSIONS_LIST.map((perm) => (
                <tr key={perm.name} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3.5 font-mono text-xs font-medium text-slate-900 whitespace-nowrap">
                    {perm.name}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                    {perm.scope}
                  </td>
                  <td className="px-6 py-3.5 text-xs leading-relaxed text-slate-600">
                    {perm.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
