/**
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
