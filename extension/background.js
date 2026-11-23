/**
 * LinkQR Background Script (Cross-Browser Manifest V3 — Firefox, Chromium & Safari)
 * Runs as a non-persistent event page in Firefox and a service worker in Chromium/Safari.
 * Registers context menus for links, selected text, and pages, resolves active Firefox
 * theme colors when available, and injects the overlay scripts strictly on demand via
 * activeTab + scripting (zero background footprint on browsing tabs, no <all_urls> permission).
 */

const hasBrowserNamespace = typeof globalThis.browser !== "undefined";
const extApi = hasBrowserNamespace ? globalThis.browser : globalThis.chrome;

const MENU_IDS = {
  LINK: "linkqr-show-link",
  SELECTION: "linkqr-show-selection",
  PAGE: "linkqr-show-page",
};

function removeAllContextMenus() {
  if (hasBrowserNamespace) {
    return extApi.contextMenus.removeAll();
  }
  return new Promise((resolve) => {
    extApi.contextMenus.removeAll(() => {
      void extApi.runtime.lastError;
      resolve();
    });
  });
}

function createContextMenu(properties) {
  if (hasBrowserNamespace) {
    extApi.contextMenus.create(properties);
    return;
  }
  extApi.contextMenus.create(properties, () => {
    void extApi.runtime.lastError;
  });
}

function registerContextMenus() {
  Promise.resolve(removeAllContextMenus())
    .then(() => {
      createContextMenu({
        id: MENU_IDS.LINK,
        title: "Show QR Code for Link",
        contexts: ["link"],
      });

      createContextMenu({
        id: MENU_IDS.SELECTION,
        title: "Show QR Code for Selection",
        contexts: ["selection"],
      });

      createContextMenu({
        id: MENU_IDS.PAGE,
        title: "Show QR Code for This Page",
        contexts: ["page"],
      });
    })
    .catch((err) => {
      console.warn("LinkQR failed to register context menus:", err);
    });
}

// Top-level MV3 event listeners (required for both Firefox event pages and MV3 service workers)
extApi.runtime.onInstalled.addListener(registerContextMenus);
if (extApi.runtime.onStartup) {
  extApi.runtime.onStartup.addListener(registerContextMenus);
}

async function getActiveThemeColors(windowId) {
  if (!extApi.theme || typeof extApi.theme.getCurrent !== "function") {
    return null;
  }
  try {
    const themeInfo = await extApi.theme.getCurrent(windowId);
    return themeInfo && themeInfo.colors ? themeInfo.colors : null;
  } catch {
    return null;
  }
}

function sendMessageToTab(tabId, message) {
  if (hasBrowserNamespace) {
    return extApi.tabs.sendMessage(tabId, message);
  }
  return new Promise((resolve, reject) => {
    extApi.tabs.sendMessage(tabId, message, (response) => {
      if (extApi.runtime.lastError) {
        reject(new Error(extApi.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

function injectContentScripts(tabId) {
  return extApi.scripting.executeScript({
    target: { tabId },
    files: ["qrcodegen.js", "content.js"],
  });
}

extApi.contextMenus.onClicked.addListener(async (info, tab) => {
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
    // Reuse the already-injected content script if LinkQR was previously opened on this tab
    await sendMessageToTab(tab.id, message);
  } catch {
    // Pure on-demand injection via activeTab + scripting on first trigger in this tab
    try {
      await injectContentScripts(tab.id);
      await sendMessageToTab(tab.id, message);
    } catch (err) {
      console.warn("LinkQR cannot display on restricted browser pages:", err);
    }
  }
});
