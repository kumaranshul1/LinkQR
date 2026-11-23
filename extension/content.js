/**
 * LinkQR Content Script (Cross-Browser Manifest V3 — Firefox, Chromium & Safari)
 * Tracks right-click coordinates and mounts a Shadow DOM floating QR card styled
 * with active Firefox theme colors when available, or OS/browser light & dark mode.
 * Uses Project Nayuki's MIT-licensed qrcodegen library with free ECC boosting.
 */

(() => {
  if (window.__LINKQR_INITIALIZED__) return;
  window.__LINKQR_INITIALIZED__ = true;

  const extApi = typeof globalThis.browser !== "undefined" ? globalThis.browser : globalThis.chrome;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const HOST_ID = "linkqr-floating-overlay-host";
  const CARD_WIDTH = 248;
  const CARD_ESTIMATED_HEIGHT = 278;
  const VIEWPORT_MARGIN = 14;
  const CONTEXT_MAX_AGE_MS = 15000;

  let lastContextPoint = null;
  let lastContextTime = 0;
  let lastAnchorRect = null;
  let activeHost = null;

  // Capture cursor position and link bounding box on subsequent right-clicks in this tab
  document.addEventListener(
    "contextmenu",
    (event) => {
      lastContextPoint = { x: event.clientX, y: event.clientY };
      lastContextTime = Date.now();
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
    const match = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
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
      (prefersDark ? "#202124" : "#FFFFFF");
    const cardText =
      (colors && (colors.popup_text || colors.toolbar_text || colors.tab_background_text)) ||
      (prefersDark ? "#F1F3F4" : "#15141A");
    const cardBorder =
      (colors && (colors.popup_border || colors.toolbar_bottom_separator)) ||
      (prefersDark ? "#3C4043" : "#D7D7DB");

    const bgRgb = parseCssColor(cardBg);
    const fgRgb = parseCssColor(cardText);
    const cardMutedText = fgRgb
      ? `rgba(${Math.round(fgRgb.r)}, ${Math.round(fgRgb.g)}, ${Math.round(fgRgb.b)}, 0.72)`
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

    const hasFreshContext =
      lastContextPoint !== null && Date.now() - lastContextTime < CONTEXT_MAX_AGE_MS;

    let rect = hasFreshContext ? lastAnchorRect : null;
    if (
      typeof targetElementId === "number" &&
      extApi &&
      extApi.menus &&
      typeof extApi.menus.getTargetElement === "function"
    ) {
      const el = extApi.menus.getTargetElement(targetElementId);
      if (el && typeof el.getBoundingClientRect === "function") {
        const targetRect = el.getBoundingClientRect();
        if (targetRect.width > 0 || targetRect.height > 0) {
          rect = targetRect;
        }
      }
    }

    if (hasFreshContext) {
      anchorX = lastContextPoint.x + 12;
      anchorY = rect ? rect.bottom + 10 : lastContextPoint.y + 12;
    } else if (rect) {
      // First on-demand click in Firefox where menus.getTargetElement resolves the clicked link
      anchorX = rect.left;
      anchorY = rect.bottom + 10;
    }

    // Flip above the link if there isn't enough room below
    if (rect && anchorY + CARD_ESTIMATED_HEIGHT > window.innerHeight - VIEWPORT_MARGIN) {
      const aboveY = rect.top - CARD_ESTIMATED_HEIGHT - 10;
      if (aboveY >= VIEWPORT_MARGIN) {
        anchorY = aboveY;
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
          parts.push(`M${x + quietZone},${y + quietZone}h1v1h-1z`);
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

  function buildQrSvgElement(qr, theme) {
    const quietZone = 4;
    const viewBoxSize = qr.size + quietZone * 2;
    const pathData = qrToSvgPath(qr, quietZone);

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${viewBoxSize} ${viewBoxSize}`);
    svg.setAttribute("width", "200");
    svg.setAttribute("height", "200");
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Scannable QR code");

    const bgRect = document.createElementNS(SVG_NS, "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", theme.qrBg);

    const modulesPath = document.createElementNS(SVG_NS, "path");
    modulesPath.setAttribute("d", pathData);
    modulesPath.setAttribute("fill", theme.qrFg);

    svg.appendChild(bgRect);
    svg.appendChild(modulesPath);
    return svg;
  }

  function buildCloseIconSvg() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 14 14");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.75");
    svg.setAttribute("stroke-linecap", "round");

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M3 3l8 8M11 3l-8 8");
    svg.appendChild(path);
    return svg;
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

    let qrSvgEl = null;
    let errorMessage = "";
    try {
      const qr = encodePayloadToQr(payload);
      qrSvgEl = buildQrSvgElement(qr, theme);
    } catch {
      errorMessage = "Selected content exceeds the maximum QR code capacity.";
    }

    const style = document.createElement("style");
    style.textContent = `
      @keyframes lqrPop {
        from { opacity: 0; transform: translateY(4px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .card {
        position: fixed;
        left: ${Math.round(left)}px;
        top: ${Math.round(top)}px;
        width: ${CARD_WIDTH}px;
        box-sizing: border-box;
        padding: 16px;
        border-radius: 12px;
        background: ${theme.cardBg};
        color: ${theme.cardText};
        border: 1px solid ${theme.cardBorder};
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
        color: ${theme.cardMutedText};
        cursor: pointer;
        padding: 0;
        transition: opacity 120ms ease, background 120ms ease;
      }
      .close-btn:hover {
        color: ${theme.cardText};
        background: rgba(127, 127, 127, 0.16);
      }
      .close-btn:focus-visible {
        outline: 2px solid ${theme.cardText};
        outline-offset: 1px;
      }
      .qr-frame {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 8px auto 12px auto;
        border-radius: 8px;
        overflow: hidden;
        background: ${theme.qrBg};
        width: 200px;
        height: 200px;
      }
      .caption {
        margin: 0;
        font-size: 12px;
        line-height: 1.4;
        color: ${theme.cardMutedText};
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
        color: ${theme.cardText};
        text-align: center;
      }
      @media (prefers-reduced-motion: reduce) {
        .card { animation: none; }
      }
    `;

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "QR Code");

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close QR code");
    closeBtn.appendChild(buildCloseIconSvg());
    closeBtn.addEventListener("click", dismissOverlay);
    card.appendChild(closeBtn);

    if (errorMessage) {
      const errEl = document.createElement("p");
      errEl.className = "error";
      errEl.textContent = errorMessage;
      card.appendChild(errEl);
    } else if (qrSvgEl) {
      const qrFrame = document.createElement("div");
      qrFrame.className = "qr-frame";
      qrFrame.appendChild(qrSvgEl);
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

  extApi.runtime.onMessage.addListener((message) => {
    if (message && message.type === "LINKQR_SHOW" && typeof message.payload === "string") {
      showOverlay(message);
    }
  });
})();
