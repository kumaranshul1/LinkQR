# LinkQR — Cross-Browser Extension (Manifest V3)

Right-click any link, highlighted text selection, or webpage to display a crisp, offline floating QR code right beside your cursor for instant phone scanning.

## Installation

### Firefox (109+)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** and select `manifest.json`.
3. For permanent signing, upload the Firefox `.zip` under **On your own** at https://addons.mozilla.org/developers/ to obtain a signed `.xpi`.

### Chrome, Edge, Brave, Opera, Vivaldi & Arc
1. Extract the Chromium `.zip` archive to a local folder.
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
3. Enable **Developer mode**, click **Load unpacked**, and select the extracted folder.

### Safari (macOS / iOS)
1. Extract the Chromium/Safari `.zip` archive to a local folder (e.g. `./linkqr-safari`).
2. Run Apple's Web Extension converter in Terminal (requires Xcode):
   `xcrun safari-web-extension-converter ./linkqr-safari --app-name LinkQR --bundle-identifier com.local.linkqr`
3. Build and run the generated Xcode project, then enable **LinkQR** in Safari → Settings → Extensions.

## Permissions Used

- `contextMenus`: Adds right-click menu entries for links, selections, and pages.
- `activeTab` & `scripting`: Allows displaying the QR card immediately even on tabs opened before installation.
- `theme` *(Firefox package only)*: Reads active Firefox theme colors (`popup`, `popup_text`, `popup_border`). On Chromium and Safari, LinkQR automatically follows your browser/OS light and dark mode via `prefers-color-scheme`.

## Credits

QR code generation runs 100% offline using Project Nayuki's [QR-Code-generator](https://github.com/nayuki/QR-Code-generator) (MIT License) with automatic error-correction boosting (`boostEcl`).
