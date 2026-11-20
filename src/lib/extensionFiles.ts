/**
 * Single source of truth for the packaged Manifest V3 Firefox extension files.
 * Consumed identically by the Extension Source inspector and the client-side ZIP packager.
 */

import QRCODEGEN_JS from './vendor/qrcodegen-browser.js?raw';

export interface ExtensionFile {
  path: string;
  language: 'json' | 'javascript' | 'svg' | 'markdown';
  summary: string;
  content: string;
}

const MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "LinkQR",
  "version": "1.0.0",
  "description": "Right-click any link, highlighted text, or webpage to display a theme-matched floating QR code for instant phone scanning.",
  "icons": {
    "48": "icons/icon.svg",
    "96": "icons/icon.svg",
    "128": "icons/icon.svg"
  },
  "permissions": [
    "contextMenus",
    "activeTab",
    "scripting",
    "theme"
  ],
  "background": {
    "scripts": ["background.js"]
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["qrcodegen.js", "content.js"],
      "run_at": "document_idle"
    }
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "linkqr@firefox-extension.local",
      "strict_min_version": "109.0"
    }
  }
}
`;

const BACKGROUND_JS = `/**
 * LinkQR Background Event Page (Manifest V3 — Firefox 109+)
 * Registers context menus for links, selected text, and pages, resolves the user's
 * active Firefox theme via browser.theme.getCurrent(), and triggers the floating card.
 */

const MENU_IDS = {
  LINK: "linkqr-show-link",
  SELECTION: "linkqr-show-selection",
  PAGE: "linkqr-show-page",
};

function registerContextMenus() {
  browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({
      id: MENU_IDS.LINK,
      title: "Show QR Code for Link",
      contexts: ["link"],
    });

    browser.contextMenus.create({
      id: MENU_IDS.SELECTION,
      title: "Show QR Code for Selection",
      contexts: ["selection"],
    });

    browser.contextMenus.create({
      id: MENU_IDS.PAGE,
      title: "Show QR Code for This Page",
      contexts: ["page"],
    });
  });
}

// Top-level MV3 event listeners (required for non-persistent Firefox event pages)
browser.runtime.onInstalled.addListener(registerContextMenus);
browser.runtime.onStartup.addListener(registerContextMenus);

async function getActiveThemeColors(windowId) {
  try {
    const themeInfo = await browser.theme.getCurrent(windowId);
    return themeInfo && themeInfo.colors ? themeInfo.colors : null;
  } catch {
    return null;
  }
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || typeof tab.id !== "number") return;

  let payload = "";
  let triggerType = "link";

  if (info.menuItemId === MENU_IDS.LINK && info.linkUrl) {
    payload = info.linkUrl;
    triggerType = "link";
  } else if (info.menuItemId === MENU_IDS.SELECTION && info.selectionText) {
    payload = info.selectionText.trim();
    triggerType = "selection";
  } else if (info.menuItemId === MENU_IDS.PAGE) {
    payload = info.pageUrl || tab.url || "";
    triggerType = "page";
  }

  if (!payload) return;

  const themeColors = await getActiveThemeColors(tab.windowId);
  const message = {
    type: "LINKQR_SHOW",
    payload,
    triggerType,
    targetElementId: info.targetElementId ?? null,
    themeColors,
  };

  try {
    await browser.tabs.sendMessage(tab.id, message);
  } catch {
    // Fallback for tabs that were already open prior to installing or reloading LinkQR
    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["qrcodegen.js", "content.js"],
      });
      await browser.tabs.sendMessage(tab.id, message);
    } catch (err) {
      console.warn("LinkQR cannot display on restricted browser pages:", err);
    }
  }
});
`;

const CONTENT_JS = `/**
 * LinkQR Content Script — Tracks right-click coordinates and mounts a Shadow DOM
 * floating QR card styled with the user's active Firefox theme colors.
 * Uses Project Nayuki's MIT-licensed qrcodegen library with free ECC boosting.
 */

(() => {
  if (window.__LINKQR_INITIALIZED__) return;
  window.__LINKQR_INITIALIZED__ = true;

  const HOST_ID = "linkqr-floating-overlay-host";
  const CARD_WIDTH = 248;
  const CARD_ESTIMATED_HEIGHT = 278;
  const VIEWPORT_MARGIN = 14;

  let lastContextPoint = null;
  let lastAnchorRect = null;
  let activeHost = null;

  // Capture cursor position and link bounding box on every right-click
  document.addEventListener(
    "contextmenu",
    (event) => {
      lastContextPoint = { x: event.clientX, y: event.clientY };
      const linkEl =
        event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (linkEl) {
        const rect = linkEl.getBoundingClientRect();
        lastAnchorRect = {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      } else {
        lastAnchorRect = null;
      }
    },
    true
  );

  function parseCssColor(input) {
    if (!input || typeof input !== "string") return null;
    const trimmed = input.trim();
    if (trimmed.startsWith("#")) {
      const hex = trimmed.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      }
      if (hex.length === 6 || hex.length === 8) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        };
      }
    }
    const match = trimmed.match(/^rgba?\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)/i);
    if (match) {
      return {
        r: Math.min(255, Math.max(0, Number(match[1]))),
        g: Math.min(255, Math.max(0, Number(match[2]))),
        b: Math.min(255, Math.max(0, Number(match[3]))),
      };
    }
    return null;
  }

  function relativeLuminance(rgb) {
    const toLinear = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
  }

  function contrastRatio(a, b) {
    const lumA = relativeLuminance(a);
    const lumB = relativeLuminance(b);
    return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
  }

  function resolveTheme(colors) {
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    const cardBg =
      (colors && (colors.popup || colors.toolbar || colors.frame)) ||
      (prefersDark ? "#2B2A33" : "#FFFFFF");
    const cardText =
      (colors && (colors.popup_text || colors.toolbar_text || colors.tab_background_text)) ||
      (prefersDark ? "#FBFBFE" : "#15141A");
    const cardBorder =
      (colors && (colors.popup_border || colors.toolbar_bottom_separator)) ||
      (prefersDark ? "#52525E" : "#D7D7DB");

    const bgRgb = parseCssColor(cardBg);
    const fgRgb = parseCssColor(cardText);
    const cardMutedText = fgRgb
      ? \`rgba(\${Math.round(fgRgb.r)}, \${Math.round(fgRgb.g)}, \${Math.round(fgRgb.b)}, 0.72)\`
      : cardText;

    if (bgRgb && fgRgb) {
      const bgLum = relativeLuminance(bgRgb);
      const fgLum = relativeLuminance(fgRgb);
      if (bgLum > 0.65 && bgLum > fgLum && contrastRatio(bgRgb, fgRgb) >= 7.0) {
        return {
          cardBg,
          cardText,
          cardMutedText,
          cardBorder,
          qrBg: cardBg,
          qrFg: cardText,
          usedContrastPlate: false,
        };
      }
    }

    return {
      cardBg,
      cardText,
      cardMutedText,
      cardBorder,
      qrBg: "#FFFFFF",
      qrFg: "#111111",
      usedContrastPlate: true,
    };
  }

  function resolvePosition(targetElementId) {
    let anchorX = window.innerWidth / 2 - CARD_WIDTH / 2;
    let anchorY = window.innerHeight / 2 - CARD_ESTIMATED_HEIGHT / 2;

    let rect = lastAnchorRect;
    if (
      typeof targetElementId === "number" &&
      typeof browser !== "undefined" &&
      browser.menus &&
      typeof browser.menus.getTargetElement === "function"
    ) {
      const el = browser.menus.getTargetElement(targetElementId);
      if (el && typeof el.getBoundingClientRect === "function") {
        const targetRect = el.getBoundingClientRect();
        if (targetRect.width > 0 || targetRect.height > 0) {
          rect = targetRect;
        }
      }
    }

    if (lastContextPoint) {
      anchorX = lastContextPoint.x + 12;
      anchorY = rect ? rect.bottom + 10 : lastContextPoint.y + 12;

      // Flip above the link if there isn't enough room below
      if (anchorY + CARD_ESTIMATED_HEIGHT > window.innerHeight - VIEWPORT_MARGIN && rect) {
        const aboveY = rect.top - CARD_ESTIMATED_HEIGHT - 10;
        if (aboveY >= VIEWPORT_MARGIN) {
          anchorY = aboveY;
        }
      }
    }

    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, anchorX),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN)
    );
    const top = Math.min(
      Math.max(VIEWPORT_MARGIN, anchorY),
      Math.max(VIEWPORT_MARGIN, window.innerHeight - CARD_ESTIMATED_HEIGHT - VIEWPORT_MARGIN)
    );

    return { left, top };
  }

  function encodePayloadToQr(payload) {
    const QRC = globalThis.qrcodegen.QrCode;
    const QSeg = globalThis.qrcodegen.QrSegment;
    const segs = QSeg.makeSegments(payload);

    try {
      return QRC.encodeSegments(segs, QRC.Ecc.MEDIUM, QRC.MIN_VERSION, QRC.MAX_VERSION, -1, true);
    } catch {
      return QRC.encodeSegments(segs, QRC.Ecc.LOW, QRC.MIN_VERSION, QRC.MAX_VERSION, -1, true);
    }
  }

  function qrToSvgPath(qr, quietZone) {
    const parts = [];
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) {
          parts.push(\`M\${x + quietZone},\${y + quietZone}h1v1h-1z\`);
        }
      }
    }
    return parts.join("");
  }

  function dismissOverlay() {
    if (activeHost && activeHost.parentNode) {
      activeHost.parentNode.removeChild(activeHost);
    }
    activeHost = null;
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("mousedown", handleOutsideClick, true);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      dismissOverlay();
    }
  }

  function handleOutsideClick(event) {
    if (!activeHost) return;
    const path = event.composedPath ? event.composedPath() : [];
    if (!path.includes(activeHost)) {
      dismissOverlay();
    }
  }

  function showOverlay({ payload, targetElementId, themeColors }) {
    dismissOverlay();

    const theme = resolveTheme(themeColors);
    const { left, top } = resolvePosition(targetElementId);

    const host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:2147483647;margin:0;padding:0;";

    const shadow = host.attachShadow({ mode: "open" });

    let qrSvgHtml = "";
    let errorMessage = "";
    try {
      const qr = encodePayloadToQr(payload);
      const quietZone = 4;
      const viewBoxSize = qr.size + quietZone * 2;
      const pathData = qrToSvgPath(qr, quietZone);
      qrSvgHtml = \`
        <svg viewBox="0 0 \${viewBoxSize} \${viewBoxSize}" width="200" height="200" shape-rendering="crispEdges" role="img" aria-label="Scannable QR code">
          <rect width="100%" height="100%" fill="\${theme.qrBg}" />
          <path d="\${pathData}" fill="\${theme.qrFg}" />
        </svg>
      \`;
    } catch {
      errorMessage = "Selected content exceeds the maximum QR code capacity.";
    }

    const style = document.createElement("style");
    style.textContent = \`
      @keyframes lqrPop {
        from { opacity: 0; transform: translateY(4px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .card {
        position: fixed;
        left: \${Math.round(left)}px;
        top: \${Math.round(top)}px;
        width: \${CARD_WIDTH}px;
        box-sizing: border-box;
        padding: 16px;
        border-radius: 12px;
        background: \${theme.cardBg};
        color: \${theme.cardText};
        border: 1px solid \${theme.cardBorder};
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.08);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        pointer-events: auto;
        animation: lqrPop 140ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .close-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: \${theme.cardMutedText};
        cursor: pointer;
        padding: 0;
        transition: opacity 120ms ease, background 120ms ease;
      }
      .close-btn:hover {
        color: \${theme.cardText};
        background: rgba(127, 127, 127, 0.16);
      }
      .close-btn:focus-visible {
        outline: 2px solid \${theme.cardText};
        outline-offset: 1px;
      }
      .qr-frame {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 8px auto 12px auto;
        border-radius: 8px;
        overflow: hidden;
        background: \${theme.qrBg};
        width: 200px;
        height: 200px;
      }
      .caption {
        margin: 0;
        font-size: 12px;
        line-height: 1.4;
        color: \${theme.cardMutedText};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .error {
        margin: 18px 0 8px 0;
        font-size: 13px;
        line-height: 1.5;
        color: \${theme.cardText};
        text-align: center;
      }
      @media (prefers-reduced-motion: reduce) {
        .card { animation: none; }
      }
    \`;

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "QR Code");

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close QR code");
    closeBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>';
    closeBtn.addEventListener("click", dismissOverlay);
    card.appendChild(closeBtn);

    if (errorMessage) {
      const errEl = document.createElement("p");
      errEl.className = "error";
      errEl.textContent = errorMessage;
      card.appendChild(errEl);
    } else {
      const qrFrame = document.createElement("div");
      qrFrame.className = "qr-frame";
      qrFrame.innerHTML = qrSvgHtml;
      card.appendChild(qrFrame);

      const caption = document.createElement("p");
      caption.className = "caption";
      caption.textContent = payload;
      caption.title = payload;
      card.appendChild(caption);
    }

    shadow.appendChild(style);
    shadow.appendChild(card);
    document.documentElement.appendChild(host);
    activeHost = host;

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", handleOutsideClick, true);
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message && message.type === "LINKQR_SHOW" && typeof message.payload === "string") {
      showOverlay(message);
    }
  });
})();
`;

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="22" fill="#0F172A"/>
  <rect x="18" y="18" width="24" height="24" rx="4" stroke="#FFFFFF" stroke-width="6"/>
  <rect x="27" y="27" width="6" height="6" rx="1" fill="#FFFFFF"/>
  <rect x="54" y="18" width="24" height="24" rx="4" stroke="#FFFFFF" stroke-width="6"/>
  <rect x="63" y="27" width="6" height="6" rx="1" fill="#FFFFFF"/>
  <rect x="18" y="54" width="24" height="24" rx="4" stroke="#FFFFFF" stroke-width="6"/>
  <rect x="27" y="63" width="6" height="6" rx="1" fill="#FFFFFF"/>
  <rect x="54" y="54" width="10" height="10" rx="2" fill="#E85D2A"/>
  <rect x="68" y="54" width="10" height="10" rx="2" fill="#FFFFFF"/>
  <rect x="54" y="68" width="10" height="10" rx="2" fill="#FFFFFF"/>
  <rect x="68" y="68" width="10" height="10" rx="2" fill="#E85D2A"/>
</svg>
`;

const README_MD = `# LinkQR — Firefox Extension (Manifest V3)

Right-click any link, highlighted text selection, or webpage in Firefox to display a crisp, theme-matched floating QR code right beside your cursor.

## Quick Temporary Install (Firefox 109+)

1. Extract this ZIP archive to a local folder.
2. Open Firefox and navigate to \`about:debugging#/runtime/this-firefox\`.
3. Click **Load Temporary Add-on...**
4. Select the \`manifest.json\` file inside the extracted folder.
5. Right-click any link, highlighted text, or page background and select **Show QR Code**.

## Permanent Installation (Signed .xpi)

Firefox requires extensions installed permanently on standard Release builds to be signed by Mozilla Add-ons (AMO):

1. Create a free developer account at https://addons.mozilla.org/developers/
2. Upload this ZIP archive and choose **On your own** (unlisted self-distribution) for instant automated signing.
3. Download the signed \`.xpi\` file and drag it into Firefox to install permanently.

## Permissions Used

- \`contextMenus\`: Adds the right-click menu entries for links, selections, and pages.
- \`activeTab\` & \`scripting\`: Allows displaying the QR card even on tabs opened before installation.
- \`theme\`: Reads your active Firefox theme colors (\`popup\`, \`popup_text\`, \`popup_border\`) so the floating card blends naturally with your browser.

## Credits

QR code generation is powered offline by Project Nayuki's [QR-Code-generator](https://github.com/nayuki/QR-Code-generator) (MIT License) with automatic error-correction boosting (\`boostEcl\`).
`;

export const EXTENSION_FILES: readonly ExtensionFile[] = [
  {
    path: 'manifest.json',
    language: 'json',
    summary: 'Manifest V3 definition targeting Firefox 109+ with Gecko ID, theme API permission, and MV3 event page.',
    content: MANIFEST_JSON,
  },
  {
    path: 'background.js',
    language: 'javascript',
    summary: 'Non-persistent MV3 event page registering link, selection, and page context menus and resolving active Firefox theme colors.',
    content: BACKGROUND_JS,
  },
  {
    path: 'content.js',
    language: 'javascript',
    summary: 'Tracks right-click position, applies Firefox theme colors with a WCAG contrast guard, and renders the Shadow DOM floating QR card.',
    content: CONTENT_JS,
  },
  {
    path: 'qrcodegen.js',
    language: 'javascript',
    summary: 'Official Project Nayuki QR Code generator (MIT License) compiled to ES2020 — supports Numeric/Alphanumeric/Byte modes and automatic ECC boosting.',
    content: QRCODEGEN_JS,
  },
  {
    path: 'icons/icon.svg',
    language: 'svg',
    summary: 'Scalable vector extension icon supported natively by Firefox.',
    content: ICON_SVG,
  },
  {
    path: 'README.md',
    language: 'markdown',
    summary: 'Step-by-step instructions for temporary loading, permanent AMO signing, and MIT attribution.',
    content: README_MD,
  },
];
