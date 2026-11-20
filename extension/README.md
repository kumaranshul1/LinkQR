# LinkQR — Firefox Extension (Manifest V3)

Right-click any link, highlighted text selection, or webpage in Firefox to display a crisp, theme-matched floating QR code right beside your cursor.

## Quick Temporary Install (Firefox 109+)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select the `manifest.json` file inside this folder.
4. Right-click any link, highlighted text, or page background and select **Show QR Code**.

## Permanent Installation (Signed .xpi)

Firefox requires extensions installed permanently on standard Release builds to be signed by Mozilla Add-ons (AMO):

1. Create a free developer account at https://addons.mozilla.org/developers/
2. Zip the contents of this folder (so `manifest.json` is at the archive root) and upload it under **On your own** (unlisted self-distribution) for instant automated signing.
3. Download the signed `.xpi` file and drag it into Firefox to install permanently.

## Permissions Used

- `contextMenus`: Adds the right-click menu entries for links, selections, and pages.
- `activeTab` & `scripting`: Allows displaying the QR card even on tabs opened before installation.
- `theme`: Reads your active Firefox theme colors (`popup`, `popup_text`, `popup_border`) so the floating card blends naturally with your browser.

## Credits

QR code generation is powered offline by Project Nayuki's [QR-Code-generator](https://github.com/nayuki/QR-Code-generator) (MIT License) with automatic error-correction boosting (`boostEcl`).
