import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Globe,
  Link2,
  Lock,
  Plus,
  QrCode,
  RotateCw,
  TextSelect,
} from 'lucide-react';
import {
  FIREFOX_THEME_PRESETS,
  FirefoxThemePreset,
  resolveCardTheme,
} from '../lib/themeResolver';
import { FloatingQrCard, FloatingQrState } from './FloatingQrCard';

interface SampleLink {
  id: string;
  label: string;
  url: string;
  note: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  anchorTop?: number;
  anchorBottom?: number;
  triggerType: 'link' | 'selection' | 'page';
  payload: string;
}

const INITIAL_LINKS: SampleLink[] = [
  {
    id: 'mdn-mv3',
    label: 'MDN Manifest V3 Extension Guide',
    url: 'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Develop_extensions_for_Firefox_for_Android',
    note: 'developer.mozilla.org',
  },
  {
    id: 'amo-hub',
    label: 'Mozilla Add-ons Developer Hub',
    url: 'https://addons.mozilla.org/en-US/developers/',
    note: 'addons.mozilla.org',
  },
  {
    id: 'wiki-qr',
    label: 'QR Code Technical Standard (ISO 18004)',
    url: 'https://en.wikipedia.org/wiki/QR_code',
    note: 'en.wikipedia.org',
  },
];

export function FirefoxSandbox() {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(FIREFOX_THEME_PRESETS[0].id);
  const [pageUrl, setPageUrl] = useState<string>('https://handbook.example.org/firefox-handoff');
  const [urlInput, setUrlInput] = useState<string>('https://handbook.example.org/firefox-handoff');
  const [customLinkInput, setCustomLinkInput] = useState<string>('');
  const [customLinkError, setCustomLinkError] = useState<string>('');
  const [links, setLinks] = useState<SampleLink[]>(INITIAL_LINKS);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [qrState, setQrState] = useState<FloatingQrState | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [viewportBounds, setViewportBounds] = useState({ width: 920, height: 520 });

  const activeTheme: FirefoxThemePreset = useMemo(
    () =>
      FIREFOX_THEME_PRESETS.find((t) => t.id === selectedThemeId) ?? FIREFOX_THEME_PRESETS[0],
    [selectedThemeId]
  );

  const resolvedCardTheme = useMemo(
    () => resolveCardTheme(activeTheme.colors, activeTheme.isDarkChrome),
    [activeTheme]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewportBounds({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!copiedNotice) return;
    const timer = window.setTimeout(() => setCopiedNotice(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedNotice]);

  const handleViewportContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const bounds = viewportEl.getBoundingClientRect();
    const relX = event.clientX - bounds.left;
    const relY = event.clientY - bounds.top;

    // 1. Check if the user right-clicked a link
    const anchorEl = (event.target as HTMLElement | null)?.closest('a[href]') as
      | HTMLAnchorElement
      | null;

    if (anchorEl) {
      const linkRect = anchorEl.getBoundingClientRect();
      setContextMenu({
        x: Math.min(relX, Math.max(12, bounds.width - 252)),
        y: Math.min(relY, Math.max(12, bounds.height - 136)),
        anchorTop: linkRect.top - bounds.top,
        anchorBottom: linkRect.bottom - bounds.top,
        triggerType: 'link',
        payload: anchorEl.href,
      });
      return;
    }

    // 2. Check if the user has highlighted text inside the sandbox
    const selectionText = window.getSelection()?.toString().trim() ?? '';
    if (selectionText.length > 0) {
      setContextMenu({
        x: Math.min(relX, Math.max(12, bounds.width - 252)),
        y: Math.min(relY, Math.max(12, bounds.height - 136)),
        triggerType: 'selection',
        payload: selectionText,
      });
      return;
    }

    // 3. Default to current page URL
    setContextMenu({
      x: Math.min(relX, Math.max(12, bounds.width - 252)),
      y: Math.min(relY, Math.max(12, bounds.height - 136)),
      triggerType: 'page',
      payload: pageUrl,
    });
  };

  const handleShowQrFromMenu = () => {
    if (!contextMenu) return;
    setQrState({
      payload: contextMenu.payload,
      triggerType: contextMenu.triggerType,
      anchorX: contextMenu.x,
      anchorY: contextMenu.anchorBottom ?? contextMenu.y,
      anchorTop: contextMenu.anchorTop,
    });
    setContextMenu(null);
  };

  const handleCopyFromMenu = async () => {
    if (!contextMenu) return;
    try {
      await navigator.clipboard.writeText(contextMenu.payload);
      setCopiedNotice('Copied to clipboard');
    } catch {
      setCopiedNotice('Copy unavailable in this browser');
    }
    setContextMenu(null);
  };

  const handleSelectArticleText = () => {
    setContextMenu(null);
    const container = articleRef.current;
    if (!container) return;
    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleUrlSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = urlInput.trim();
    if (!cleaned) return;
    const normalized = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    setPageUrl(normalized);
    setUrlInput(normalized);
  };

  const handleAddCustomLink = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = customLinkInput.trim();
    if (!trimmed) {
      setCustomLinkError('Enter a URL to add a testable link.');
      return;
    }
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(normalized);
      const newLink: SampleLink = {
        id: `custom-${Date.now()}`,
        label: parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : ''),
        url: parsed.toString(),
        note: parsed.hostname,
      };
      setLinks((prev) => [newLink, ...prev]);
      setCustomLinkInput('');
      setCustomLinkError('');
    } catch {
      setCustomLinkError('Enter a valid web address (e.g. https://mozilla.org).');
    }
  };

  const handleQuickTrigger = (type: 'link' | 'selection' | 'page') => {
    setContextMenu(null);
    if (type === 'link') {
      const target = links[0];
      setQrState({
        payload: target.url,
        triggerType: 'link',
        anchorX: 280,
        anchorY: 165,
        anchorTop: 140,
      });
    } else if (type === 'selection') {
      const activeSelection = window.getSelection()?.toString().trim();
      const snippet =
        activeSelection && activeSelection.length > 0
          ? activeSelection
          : 'WIFI:T:WPA;S:StudioGuest;P:firefox-handoff-2026;;';
      setQrState({
        payload: snippet,
        triggerType: 'selection',
        anchorX: 340,
        anchorY: 220,
      });
    } else {
      setQrState({
        payload: pageUrl,
        triggerType: 'page',
        anchorX: Math.max(24, viewportBounds.width - 280),
        anchorY: 36,
      });
    }
  };

  const contextMenuTitle =
    contextMenu?.triggerType === 'link'
      ? 'Show QR Code for Link'
      : contextMenu?.triggerType === 'selection'
        ? 'Show QR Code for Selection'
        : 'Show QR Code for This Page';

  const contextCopyTitle =
    contextMenu?.triggerType === 'link'
      ? 'Copy Link'
      : contextMenu?.triggerType === 'selection'
        ? 'Copy Selection'
        : 'Copy Page URL';

  return (
    <div className="space-y-6">
      {/* Intro + Firefox Theme Switcher */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Interactive Firefox Sandbox
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Right-click any link, highlight text, or right-click empty space inside the browser frame
            to scan a live QR code with your phone.
          </p>
        </div>

        {/* Simulated Firefox Theme Preset Bar */}
        <div className="flex flex-col items-start gap-1.5 lg:items-end">
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"
            role="group"
            aria-label="Simulated Firefox browser theme"
          >
            {FIREFOX_THEME_PRESETS.map((preset) => {
              const isSelected = preset.id === activeTheme.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedThemeId(preset.id)}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E85D2A] ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px] border border-black/20"
                    style={{ backgroundColor: preset.colors.popup }}
                    aria-hidden="true"
                  />
                  {preset.name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono tabular-nums">popup {activeTheme.colors.popup}</span>
            <span aria-hidden="true">·</span>
            <span>
              {resolvedCardTheme.usedContrastPlate
                ? 'White scan plate active for camera contrast'
                : `Native theme ink (${resolvedCardTheme.contrastRatio}:1 contrast)`}
            </span>
          </div>
        </div>
      </div>

      {/* Simulated Firefox Browser Window */}
      <div
        className="overflow-hidden rounded-xl border border-slate-300/90 bg-white"
        style={{
          boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* Tab Strip */}
        <div
          className="flex items-center justify-between px-3 pt-2.5 pb-0 transition-colors duration-150"
          style={{
            backgroundColor: activeTheme.colors.frame,
            color: activeTheme.colors.tab_background_text,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 pb-2 pl-1" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-current opacity-25" />
              <span className="h-2.5 w-2.5 rounded-full bg-current opacity-25" />
              <span className="h-2.5 w-2.5 rounded-full bg-current opacity-25" />
            </div>
            <div
              className="flex max-w-[240px] items-center gap-2 rounded-t-lg px-3.5 py-2 text-xs font-medium"
              style={{
                backgroundColor: activeTheme.colors.toolbar,
                color: activeTheme.colors.toolbar_text,
              }}
            >
              <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">Firefox Reading List</span>
            </div>
          </div>
          <div className="hidden pb-2 text-xs opacity-65 sm:block">
            Firefox 109+ · Theme API Active
          </div>
        </div>

        {/* Navigation & Editable Address Bar */}
        <div
          className="flex flex-wrap items-center gap-2.5 px-3 py-2 transition-colors duration-150"
          style={{
            backgroundColor: activeTheme.colors.toolbar,
            color: activeTheme.colors.toolbar_text,
            borderBottom: `1px solid ${activeTheme.colors.toolbar_bottom_separator}`,
          }}
        >
          <div className="flex items-center gap-1 opacity-60" aria-hidden="true">
            <span className="flex h-7 w-7 items-center justify-center rounded-md">
              <ArrowLeft className="h-3.5 w-3.5" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md">
              <RotateCw className="h-3.5 w-3.5" />
            </span>
          </div>

          <form onSubmit={handleUrlSubmit} className="min-w-[200px] flex-1">
            <label className="sr-only" htmlFor="sandbox-address-bar">
              Simulated Firefox current page URL
            </label>
            <div
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors"
              style={{
                backgroundColor: activeTheme.colors.toolbar_field,
                color: activeTheme.colors.toolbar_field_text,
                border: `1px solid ${activeTheme.colors.toolbar_field_border}`,
              }}
            >
              <Lock className="h-3 w-3 shrink-0 opacity-60" />
              <input
                id="sandbox-address-bar"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onBlur={handleUrlSubmit}
                className="w-full bg-transparent font-mono text-xs outline-none"
                style={{ color: activeTheme.colors.toolbar_field_text }}
                aria-label="Current page URL"
              />
            </div>
          </form>

          {/* Extension toolbar icon indicator (clickable to test current page trigger) */}
          <button
            type="button"
            onClick={() => handleQuickTrigger('page')}
            title="Show QR code for current page URL"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E85D2A]"
            style={{ color: activeTheme.colors.toolbar_text }}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">LinkQR</span>
          </button>
        </div>

        {/* Interactive Webpage Viewport */}
        <div
          ref={viewportRef}
          onContextMenu={handleViewportContextMenu}
          className="relative min-h-[520px] bg-white px-6 py-7 sm:px-10"
        >
          {/* Quick-test accessibility strip (for touch/trackpad or rapid testing) */}
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Right-click anywhere below</span>
              <span aria-hidden="true">·</span>
              <span>Or trigger directly:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickTrigger('link')}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              >
                <Link2 className="h-3.5 w-3.5 text-slate-500" />
                Test Link
              </button>
              <button
                type="button"
                onClick={() => handleQuickTrigger('selection')}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              >
                <TextSelect className="h-3.5 w-3.5 text-slate-500" />
                Test Selection
              </button>
              <button
                type="button"
                onClick={() => handleQuickTrigger('page')}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              >
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                Test Page URL
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left column: Testable links list + custom URL input */}
            <div className="space-y-5 lg:col-span-7">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  1. Right-click a link
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Right-click any link below to open the Firefox menu and display its QR code right
                  next to your cursor.
                </p>
              </div>

              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {links.map((item) => (
                  <li key={item.id} className="py-3">
                    <a
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const bounds = viewportRef.current?.getBoundingClientRect();
                        if (!bounds) return;
                        setContextMenu(null);
                        setQrState({
                          payload: item.url,
                          triggerType: 'link',
                          anchorX: rect.left - bounds.left + Math.min(rect.width, 160),
                          anchorY: rect.bottom - bounds.top,
                          anchorTop: rect.top - bounds.top,
                        });
                      }}
                      className="inline-block text-sm font-medium text-[#0A58CA] underline decoration-[#0A58CA]/35 underline-offset-4 transition-colors hover:text-[#E85D2A] hover:decoration-[#E85D2A]"
                    >
                      {item.label}
                    </a>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-slate-500">
                      <span className="truncate">{item.url}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Add your own URL to test */}
              <form onSubmit={handleAddCustomLink} className="space-y-1.5 pt-1">
                <label
                  htmlFor="custom-link-input"
                  className="block text-xs font-medium text-slate-700"
                >
                  Add your own link to test scanning
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-link-input"
                    type="text"
                    value={customLinkInput}
                    onChange={(e) => {
                      setCustomLinkInput(e.target.value);
                      if (customLinkError) setCustomLinkError('');
                    }}
                    placeholder="https://example.com/article"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#E85D2A] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Link
                  </button>
                </div>
                {customLinkError && (
                  <p className="text-xs text-red-600" role="alert">
                    {customLinkError}
                  </p>
                )}
              </form>
            </div>

            {/* Right column: Selectable text + Page background right-click area */}
            <div ref={articleRef} className="space-y-5 lg:col-span-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  2. Highlight text &amp; right-click
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Select any sentence, phone number, address, or Wi-Fi string below and right-click
                  to send it straight to your phone camera without typing.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700">
                <p>
                  Highlight this sample Wi-Fi payload to test selection encoding:{' '}
                  <span className="font-mono text-xs text-slate-900">
                    WIFI:T:WPA;S:StudioGuest;P:firefox-handoff-2026;;
                  </span>
                </p>
                <p>
                  Or highlight a meeting address like{' '}
                  <span className="font-medium text-slate-900">
                    149 New Montgomery St, San Francisco, CA 94105
                  </span>{' '}
                  and right-click to generate a scannable QR card immediately.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  3. Right-click empty page space
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Right-clicking anywhere outside a link or selection encodes the current Firefox
                  address bar URL (<span className="font-mono text-slate-700">{pageUrl}</span>).
                </p>
              </div>
            </div>
          </div>

          {copiedNotice && (
            <div
              role="status"
              className="absolute right-4 bottom-4 rounded-lg border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
            >
              {copiedNotice}
            </div>
          )}

          {/* Simulated Firefox Right-Click Context Menu */}
          {contextMenu && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="Firefox context menu"
              className="linkqr-animate-pop absolute z-30 w-[240px] rounded-lg py-1.5 text-xs"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
                backgroundColor: activeTheme.colors.popup,
                color: activeTheme.colors.popup_text,
                border: `1px solid ${activeTheme.colors.popup_border}`,
                boxShadow: '0 10px 26px rgba(15, 23, 42, 0.22)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleShowQrFromMenu}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-medium transition-colors"
                style={{ color: activeTheme.colors.popup_text }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = activeTheme.colors.popup_highlight;
                  e.currentTarget.style.color = activeTheme.colors.popup_highlight_text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = activeTheme.colors.popup_text;
                }}
              >
                <QrCode className="h-3.5 w-3.5 shrink-0 text-[#E85D2A]" />
                <span className="truncate">{contextMenuTitle}</span>
              </button>

              <div
                className="my-1 h-px w-full opacity-50"
                style={{ backgroundColor: activeTheme.colors.popup_border }}
                role="separator"
              />

              <button
                type="button"
                role="menuitem"
                onClick={handleCopyFromMenu}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
                style={{ color: activeTheme.colors.popup_text }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = activeTheme.colors.popup_highlight;
                  e.currentTarget.style.color = activeTheme.colors.popup_highlight_text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = activeTheme.colors.popup_text;
                }}
              >
                <Copy className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span>{contextCopyTitle}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleSelectArticleText}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
                style={{ color: activeTheme.colors.popup_text }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = activeTheme.colors.popup_highlight;
                  e.currentTarget.style.color = activeTheme.colors.popup_highlight_text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = activeTheme.colors.popup_text;
                }}
              >
                <TextSelect className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span>Select All Text</span>
              </button>
            </div>
          )}

          {/* Live Floating QR Card */}
          {qrState && (
            <FloatingQrCard
              qrState={qrState}
              containerWidth={viewportBounds.width}
              containerHeight={viewportBounds.height}
              theme={resolvedCardTheme}
              onDismiss={() => setQrState(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
