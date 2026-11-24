import { useState } from 'react';
import { AlertCircle, Check, Copy, Download } from 'lucide-react';
import {
  BROWSER_TARGETS,
  BROWSER_TARGET_LIST,
  BrowserTarget,
  ExtensionBundleId,
  getZipFilename,
} from '../lib/browserTargets';

interface InstallGuideProps {
  browserTarget: BrowserTarget;
  onBrowserTargetChange: (target: BrowserTarget) => void;
  onDownload: (bundleId?: ExtensionBundleId) => Promise<void>;
  downloadState: 'idle' | 'downloading' | 'done' | 'error';
}

const PERMISSIONS_LIST = [
  {
    name: 'contextMenus',
    browsers: 'All browsers',
    reason: 'Adds "Show QR Code" entries when you right-click links, highlighted text, or pages.',
  },
  {
    name: 'activeTab',
    browsers: 'All browsers',
    reason:
      'Grants temporary access only to the active tab when you click Show QR Code—no broad "<all_urls>" host permissions required.',
  },
  {
    name: 'scripting',
    browsers: 'All browsers',
    reason:
      'Injects the QR encoder and floating card strictly on demand when clicked, leaving zero background memory or CPU footprint on browsing tabs.',
  },
  {
    name: 'theme',
    browsers: 'Firefox only',
    reason:
      'Reads your active Firefox theme colors (popup, popup_text, popup_border) via browser.theme.getCurrent(). Omitted from Chromium/Safari manifests, which follow OS light/dark mode automatically.',
  },
];

const SAFARI_CONVERTER_CMD =
  'xcrun safari-web-extension-converter ./linkqr-safari --app-name LinkQR --bundle-identifier com.local.linkqr';

export function InstallGuide({
  browserTarget,
  onBrowserTargetChange,
  onDownload,
  downloadState,
}: InstallGuideProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeMeta = BROWSER_TARGETS[browserTarget];
  const activeZip = getZipFilename(activeMeta.bundleId);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="space-y-8">
      {/* Header + Primary Download */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Install LinkQR in Any MV3 Browser
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose your browser below for the exact package and step-by-step setup instructions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDownload(activeMeta.bundleId)}
          disabled={downloadState === 'downloading'}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors disabled:opacity-60 ${
            downloadState === 'error'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-[#E85D2A] hover:bg-[#D14F20]'
          }`}
        >
          {downloadState === 'done' ? (
            <>
              <Check className="h-4 w-4" />
              Downloaded {activeZip}
            </>
          ) : downloadState === 'error' ? (
            <>
              <AlertCircle className="h-4 w-4" />
              Download Failed — Retry
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {activeMeta.downloadLabel}
            </>
          )}
        </button>
      </div>

      {/* Browser Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"
          role="tablist"
          aria-label="Browser installation guides"
        >
          {BROWSER_TARGET_LIST.map((target) => {
            const isSelected = target.id === browserTarget;
            return (
              <button
                key={target.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onBrowserTargetChange(target.id)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {target.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500">
          Package: <span className="font-mono text-slate-800">{activeZip}</span>
        </div>
      </div>

      {/* Firefox Walkthrough */}
      {browserTarget === 'firefox' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900">
                01. Quick Load in Firefox (109+)
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
                  Download <span className="font-mono text-xs text-slate-900">linkqr-firefox-mv3.zip</span>{' '}
                  and unzip it to a local folder (or select{' '}
                  <span className="font-mono text-xs text-slate-900">extension/manifest.json</span>{' '}
                  directly if you cloned the repo).
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
                      onClick={() => handleCopy('ff-url', 'about:debugging#/runtime/this-firefox')}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50"
                    >
                      {copiedId === 'ff-url' ? (
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
                  Click <span className="font-medium text-slate-900">Load Temporary Add-on…</span>{' '}
                  and select <span className="font-mono text-xs text-slate-900">manifest.json</span>.
                </div>
              </li>

              <li className="flex gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
                  4
                </span>
                <div>
                  Right-click any link, highlighted text, or webpage background and choose{' '}
                  <span className="font-medium text-slate-900">Show QR Code</span>. Your active
                  Firefox theme colors apply automatically.
                </div>
              </li>
            </ol>
          </section>

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
                  Choose <span className="font-medium text-slate-900">On your own</span> (unlisted
                  self-distribution) and upload{' '}
                  <span className="font-mono text-xs text-slate-900">linkqr-firefox-mv3.zip</span>.
                </div>
              </li>
              <li className="flex gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
                  3
                </span>
                <div>
                  Download the signed <span className="font-mono text-xs text-slate-900">.xpi</span>{' '}
                  file and drag it onto any Firefox window to install permanently.
                </div>
              </li>
            </ol>
          </section>
        </div>
      )}

      {/* Chromium Walkthrough */}
      {browserTarget === 'chromium' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900">
                01. Load Unpacked in Chrome, Edge, Brave, Opera, Vivaldi, or Arc
              </h2>
              <span className="text-xs text-slate-500">
                Persists across browser restarts · Zero store account needed
              </span>
            </div>

            <ol className="mt-5 space-y-4 text-sm text-slate-700">
              <li className="flex gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
                  1
                </span>
                <div>
                  Download{' '}
                  <span className="font-mono text-xs text-slate-900">
                    linkqr-chromium-safari-mv3.zip
                  </span>{' '}
                  and unzip it into a permanent folder (e.g.{' '}
                  <span className="font-mono text-xs text-slate-900">~/Extensions/LinkQR</span>). If
                  you cloned the repo locally, run{' '}
                  <span className="font-mono text-xs text-slate-900">
                    npm run package:extension
                  </span>{' '}
                  to generate{' '}
                  <span className="font-mono text-xs text-slate-900">
                    dist-extension/chromium-safari/
                  </span>{' '}
                  (the repo keeps Chromium’s manifest at{' '}
                  <span className="font-mono text-xs text-slate-900">
                    extension/manifest.chromium.json
                  </span>
                  ).
                </div>
              </li>

              <li className="flex gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
                  2
                </span>
                <div className="space-y-2">
                  <div>
                    Open your browser’s Extensions page (replace <span className="font-mono text-xs">chrome</span> with{' '}
                    <span className="font-mono text-xs">edge</span> or{' '}
                    <span className="font-mono text-xs">brave</span> as needed):
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-900">
                      chrome://extensions
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy('chr-url', 'chrome://extensions')}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50"
                    >
                      {copiedId === 'chr-url' ? (
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
                  Toggle <span className="font-medium text-slate-900">Developer mode</span> on in
                  the top right, click{' '}
                  <span className="font-medium text-slate-900">Load unpacked</span>, and select the
                  extracted folder containing{' '}
                  <span className="font-mono text-xs text-slate-900">manifest.json</span>.
                </div>
              </li>

              <li className="flex gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
                  4
                </span>
                <div>
                  Right-click any link, selection, or page and choose{' '}
                  <span className="font-medium text-slate-900">Show QR Code</span>. The floating
                  card automatically follows your OS/browser Light and Dark appearance.
                </div>
              </li>
            </ol>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900">
                02. Publishing to Chrome Web Store or Edge Add-ons
              </h2>
              <span className="text-xs text-slate-500">
                Zero manifest warnings · Compliant PNG icon set included
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              Upload <span className="font-mono text-xs text-slate-900">linkqr-chromium-safari-mv3.zip</span>{' '}
              directly to the Chrome Web Store Developer Dashboard or Microsoft Edge Add-ons Partner
              Center. The manifest contains only standard W3C Manifest V3 keys (
              <span className="font-mono text-xs">service_worker</span> and 16/32/48/128 PNG icons)
              with no Firefox-only fields.
            </p>
          </section>
        </div>
      )}

      {/* Safari Walkthrough */}
      {browserTarget === 'safari' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-900">
              01. Convert &amp; Build for Safari (macOS / iOS)
            </h2>
            <span className="text-xs text-slate-500">
              Requires macOS with Xcode installed · Uses Apple’s official Web Extension converter
            </span>
          </div>

          <ol className="mt-5 space-y-4 text-sm text-slate-700">
            <li className="flex gap-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
                1
              </span>
              <div>
                Download{' '}
                <span className="font-mono text-xs text-slate-900">
                  linkqr-chromium-safari-mv3.zip
                </span>{' '}
                and unzip it into a folder named{' '}
                <span className="font-mono text-xs text-slate-900">linkqr-safari</span> (or run{' '}
                <span className="font-mono text-xs text-slate-900">npm run package:extension</span>{' '}
                in a local clone and point the converter at{' '}
                <span className="font-mono text-xs text-slate-900">
                  ./dist-extension/chromium-safari
                </span>
                ).
              </div>
            </li>

            <li className="flex gap-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
                2
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div>Wrap the WebExtension into a native Safari app project via Terminal:</div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="block max-w-full overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-900">
                    {SAFARI_CONVERTER_CMD}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy('safari-cmd', SAFARI_CONVERTER_CMD)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50"
                  >
                    {copiedId === 'safari-cmd' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        Copy Command
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
                In the opened Xcode project, click <span className="font-medium text-slate-900">Run</span>{' '}
                (⌘R) to build the macOS container app. If using local unsigned development, enable{' '}
                <span className="font-medium text-slate-900">
                  Safari → Settings → Developer → Allow unsigned extensions
                </span>
                .
              </div>
            </li>

            <li className="flex gap-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-700 tabular-nums">
                4
              </span>
              <div>
                Open <span className="font-medium text-slate-900">Safari → Settings → Extensions</span>,
                enable <span className="font-medium text-slate-900">LinkQR</span>, and grant access
                for websites. Right-click any link, selection, or page to display its QR code.
              </div>
            </li>
          </ol>
        </section>
      )}

      {/* Permissions Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Manifest V3 Permissions</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Zero <span className="font-mono text-slate-700">&lt;all_urls&gt;</span> host
            permissions, zero background scripts injected while browsing, and 100% offline QR
            encoding.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Permission</th>
                <th className="px-6 py-3">Browsers</th>
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
                    {perm.browsers}
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
