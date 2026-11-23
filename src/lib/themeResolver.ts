/**
 * Cross-browser theme resolution (`browser.theme.getCurrent()` on Firefox and
 * `prefers-color-scheme` on Chromium & Safari) plus WCAG contrast guard for
 * guaranteed QR camera scannability.
 */

export interface BrowserChromeColors {
  frame: string;
  tab_background_text: string;
  toolbar: string;
  toolbar_text: string;
  toolbar_field: string;
  toolbar_field_text: string;
  toolbar_field_border: string;
  toolbar_bottom_separator: string;
  popup: string;
  popup_text: string;
  popup_border: string;
  popup_highlight: string;
  popup_highlight_text: string;
}

export type FirefoxThemeColors = BrowserChromeColors;

export interface FirefoxThemePreset {
  id: string;
  name: string;
  description: string;
  isDarkChrome: boolean;
  colors: BrowserChromeColors;
}

export type OsAppearance = 'light' | 'dark';

export interface ResolvedCardTheme {
  cardBg: string;
  cardText: string;
  cardMutedText: string;
  cardBorder: string;
  qrBg: string;
  qrFg: string;
  usedContrastPlate: boolean;
  contrastRatio: number;
}

export const FIREFOX_THEME_PRESETS: readonly FirefoxThemePreset[] = [
  {
    id: 'firefox-light',
    name: 'Firefox Light',
    description: 'Default light browser palette',
    isDarkChrome: false,
    colors: {
      frame: '#F0F0F4',
      tab_background_text: '#15141A',
      toolbar: '#F9F9FB',
      toolbar_text: '#15141A',
      toolbar_field: '#FFFFFF',
      toolbar_field_text: '#15141A',
      toolbar_field_border: '#D7D7DB',
      toolbar_bottom_separator: '#E0E0E6',
      popup: '#FFFFFF',
      popup_text: '#15141A',
      popup_border: '#D7D7DB',
      popup_highlight: '#E0E0E6',
      popup_highlight_text: '#15141A',
    },
  },
  {
    id: 'firefox-dark',
    name: 'Firefox Dark',
    description: 'Built-in dark theme with white scan plate',
    isDarkChrome: true,
    colors: {
      frame: '#1C1B22',
      tab_background_text: '#FBFBFE',
      toolbar: '#2B2A33',
      toolbar_text: '#FBFBFE',
      toolbar_field: '#1C1B22',
      toolbar_field_text: '#FBFBFE',
      toolbar_field_border: '#4A4954',
      toolbar_bottom_separator: '#42414D',
      popup: '#2B2A33',
      popup_text: '#FBFBFE',
      popup_border: '#52525E',
      popup_highlight: '#42414D',
      popup_highlight_text: '#FBFBFE',
    },
  },
  {
    id: 'alpenglow',
    name: 'Alpenglow',
    description: 'Mozilla plum and violet theme',
    isDarkChrome: true,
    colors: {
      frame: '#20123A',
      tab_background_text: '#F9F4FF',
      toolbar: '#2D1B4E',
      toolbar_text: '#F9F4FF',
      toolbar_field: '#1E1136',
      toolbar_field_text: '#F9F4FF',
      toolbar_field_border: '#60428F',
      toolbar_bottom_separator: '#4B2F78',
      popup: '#2D1B4E',
      popup_text: '#F9F4FF',
      popup_border: '#6C4FA0',
      popup_highlight: '#492D7A',
      popup_highlight_text: '#FFFFFF',
    },
  },
  {
    id: 'nord-frost',
    name: 'Nord Frost',
    description: 'Cool arctic slate light popup',
    isDarkChrome: false,
    colors: {
      frame: '#D8DEE9',
      tab_background_text: '#2E3440',
      toolbar: '#E5E9F0',
      toolbar_text: '#2E3440',
      toolbar_field: '#ECEFF4',
      toolbar_field_text: '#2E3440',
      toolbar_field_border: '#C4CCD9',
      toolbar_bottom_separator: '#CBD2DF',
      popup: '#ECEFF4',
      popup_text: '#2E3440',
      popup_border: '#C4CCD9',
      popup_highlight: '#D8DEE9',
      popup_highlight_text: '#2E3440',
    },
  },
  {
    id: 'forest-pine',
    name: 'Forest Pine',
    description: 'Deep evergreen dark popup',
    isDarkChrome: true,
    colors: {
      frame: '#11211B',
      tab_background_text: '#E6F2EC',
      toolbar: '#183028',
      toolbar_text: '#E6F2EC',
      toolbar_field: '#11211B',
      toolbar_field_text: '#E6F2EC',
      toolbar_field_border: '#2F5548',
      toolbar_bottom_separator: '#244539',
      popup: '#183028',
      popup_text: '#E6F2EC',
      popup_border: '#345E4F',
      popup_highlight: '#274A3D',
      popup_highlight_text: '#FFFFFF',
    },
  },
];

export const CHROMIUM_CHROME_COLORS: Record<OsAppearance, BrowserChromeColors> = {
  light: {
    frame: '#DEE1E6',
    tab_background_text: '#202124',
    toolbar: '#FFFFFF',
    toolbar_text: '#202124',
    toolbar_field: '#F1F3F4',
    toolbar_field_text: '#202124',
    toolbar_field_border: '#DADCE0',
    toolbar_bottom_separator: '#DADCE0',
    popup: '#FFFFFF',
    popup_text: '#202124',
    popup_border: '#DADCE0',
    popup_highlight: '#E8F0FE',
    popup_highlight_text: '#1967D2',
  },
  dark: {
    frame: '#202124',
    tab_background_text: '#E8EAED',
    toolbar: '#35363A',
    toolbar_text: '#E8EAED',
    toolbar_field: '#202124',
    toolbar_field_text: '#E8EAED',
    toolbar_field_border: '#3C4043',
    toolbar_bottom_separator: '#3C4043',
    popup: '#202124',
    popup_text: '#F1F3F4',
    popup_border: '#3C4043',
    popup_highlight: '#3C4043',
    popup_highlight_text: '#FFFFFF',
  },
};

export const SAFARI_CHROME_COLORS: Record<OsAppearance, BrowserChromeColors> = {
  light: {
    frame: '#ECECEE',
    tab_background_text: '#1D1D1F',
    toolbar: '#F5F5F7',
    toolbar_text: '#1D1D1F',
    toolbar_field: '#E5E5EA',
    toolbar_field_text: '#1D1D1F',
    toolbar_field_border: '#D1D1D6',
    toolbar_bottom_separator: '#D1D1D6',
    popup: '#FFFFFF',
    popup_text: '#1D1D1F',
    popup_border: '#D1D1D6',
    popup_highlight: '#007AFF',
    popup_highlight_text: '#FFFFFF',
  },
  dark: {
    frame: '#262628',
    tab_background_text: '#F5F5F7',
    toolbar: '#323234',
    toolbar_text: '#F5F5F7',
    toolbar_field: '#262628',
    toolbar_field_text: '#F5F5F7',
    toolbar_field_border: '#48484A',
    toolbar_bottom_separator: '#48484A',
    popup: '#202124',
    popup_text: '#F1F3F4',
    popup_border: '#3C4043',
    popup_highlight: '#0A84FF',
    popup_highlight_text: '#FFFFFF',
  },
};

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseCssColor(input: string | undefined): Rgb | null {
  if (!input) return null;
  const trimmed = input.trim();

  if (trimmed.startsWith('#')) {
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

function relativeLuminance(rgb: Rgb): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function withAlpha(rgb: Rgb, alpha: number): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

/**
 * Resolves Firefox `theme.colors` or OS light/dark fallback (`colors = null`)
 * into floating QR card colors while guaranteeing dark modules on a bright surface (>= 7:1).
 */
export function resolveCardTheme(
  colors: Partial<BrowserChromeColors> | null | undefined,
  prefersDark = false
): ResolvedCardTheme {
  const fallbackBg = prefersDark ? '#202124' : '#FFFFFF';
  const fallbackText = prefersDark ? '#F1F3F4' : '#15141A';
  const fallbackBorder = prefersDark ? '#3C4043' : '#D7D7DB';

  const cardBg = colors?.popup || colors?.toolbar || colors?.frame || fallbackBg;
  const cardText =
    colors?.popup_text || colors?.toolbar_text || colors?.tab_background_text || fallbackText;
  const cardBorder = colors?.popup_border || colors?.toolbar_bottom_separator || fallbackBorder;

  const bgRgb = parseCssColor(cardBg);
  const fgRgb = parseCssColor(cardText);

  const cardMutedText = fgRgb ? withAlpha(fgRgb, 0.72) : cardText;

  if (bgRgb && fgRgb) {
    const bgLum = relativeLuminance(bgRgb);
    const fgLum = relativeLuminance(fgRgb);
    const ratio = contrastRatio(bgRgb, fgRgb);

    if (bgLum > 0.65 && bgLum > fgLum && ratio >= 7.0) {
      return {
        cardBg,
        cardText,
        cardMutedText,
        cardBorder,
        qrBg: cardBg,
        qrFg: cardText,
        usedContrastPlate: false,
        contrastRatio: Number(ratio.toFixed(1)),
      };
    }
  }

  return {
    cardBg,
    cardText,
    cardMutedText,
    cardBorder,
    qrBg: '#FFFFFF',
    qrFg: '#111111',
    usedContrastPlate: true,
    contrastRatio: 18.8,
  };
}
