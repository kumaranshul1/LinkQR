import { useState } from 'react';
import {
  BookOpen,
  Check,
  Code2,
  Download,
  Menu,
  Monitor,
  QrCode,
  X,
} from 'lucide-react';
import { FirefoxSandbox } from './components/FirefoxSandbox';
import { ExtensionSourceViewer } from './components/ExtensionSourceViewer';
import { InstallGuide } from './components/InstallGuide';
import { downloadExtensionZip } from './lib/zipBuilder';

type WorkspaceTab = 'sandbox' | 'source' | 'install';

const NAV_ITEMS: { id: WorkspaceTab; label: string; icon: typeof Monitor }[] = [
  { id: 'sandbox', label: 'Live Sandbox', icon: Monitor },
  { id: 'source', label: 'Extension Source', icon: Code2 },
  { id: 'install', label: 'Install Guide', icon: BookOpen },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('sandbox');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle');

  const activeNavLabel =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Live Sandbox';

  const handleDownload = async () => {
    if (downloadState === 'downloading') return;
    setDownloadState('downloading');
    try {
      await downloadExtensionZip();
      setDownloadState('done');
      window.setTimeout(() => setDownloadState('idle'), 2200);
    } catch {
      setDownloadState('idle');
    }
  };

  const selectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] lg:flex">
      {/* Desktop Sidebar Navigation (248px) */}
      <aside className="hidden w-[248px] shrink-0 flex-col justify-between border-r border-slate-200 bg-white lg:flex">
        <div>
          <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
              <QrCode className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              LinkQR
            </span>
          </div>

          <nav aria-label="Workspace views" className="space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E85D2A] ${
                    isActive
                      ? 'bg-[#E85D2A]/10 text-[#C9481A]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-[#E85D2A]' : 'text-slate-400'
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 text-xs leading-relaxed text-slate-500">
          <div className="font-medium text-slate-700">Firefox Manifest V3</div>
          <div className="mt-1">Firefox 109+ · Theme API · Offline QR</div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary CTA on right */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <span className="font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
                LinkQR
              </span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="truncate font-medium text-slate-600">{activeNavLabel}</span>
            </nav>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadState === 'downloading'}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E85D2A] px-4 py-2 text-xs font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-[#D14F20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85D2A] disabled:opacity-60 sm:text-sm"
          >
            {downloadState === 'done' ? (
              <>
                <Check className="h-4 w-4" />
                Downloaded
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Extension (.zip)
              </>
            )}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-[#E85D2A]/10 text-[#C9481A]'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Active Workspace Viewport */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {activeTab === 'sandbox' && <FirefoxSandbox />}
          {activeTab === 'source' && <ExtensionSourceViewer />}
          {activeTab === 'install' && (
            <InstallGuide onDownload={handleDownload} downloadState={downloadState} />
          )}
        </main>
      </div>
    </div>
  );
}
