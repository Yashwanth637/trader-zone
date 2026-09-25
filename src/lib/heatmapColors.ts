/**
 * TradingView Crypto Heatmap Color Scale
 * Exactly matches Image 1 and TradingView standards:
 * -13% (deep crimson), -8% (red), -3% (soft rose), 0% (slate grey), +3% (light green), +8% (emerald green), +13% (deep vibrant green)
 */

export interface ColorStop {
  percent: number;
  bgDark: string;
  bgLight: string;
  textDark: string;
  textLight: string;
}

export const HEATMAP_COLOR_STOPS: ColorStop[] = [
  { percent: -13, bgDark: '#b91c1c', bgLight: '#dc2626', textDark: '#ffffff', textLight: '#ffffff' },
  { percent: -8,  bgDark: '#ef4444', bgLight: '#f87171', textDark: '#ffffff', textLight: '#ffffff' },
  { percent: -3,  bgDark: '#f87171', bgLight: '#fca5a5', textDark: '#ffffff', textLight: '#1e293b' },
  { percent: 0,   bgDark: '#475569', bgLight: '#cbd5e1', textDark: '#ffffff', textLight: '#0f172a' },
  { percent: 3,   bgDark: '#10b981', bgLight: '#34d399', textDark: '#ffffff', textLight: '#064e3b' },
  { percent: 8,   bgDark: '#059669', bgLight: '#10b981', textDark: '#ffffff', textLight: '#ffffff' },
  { percent: 13,  bgDark: '#047857', bgLight: '#059669', textDark: '#ffffff', textLight: '#ffffff' },
];

/**
 * Returns exact background color for a given percentage change
 */
export function getHeatmapTileColor(changePercent: number, isDark: boolean = true): { bg: string; text: string } {
  // If virtually zero (-0.3% to +0.3%), render neutral slate grey like Bitcoin (+0.10%) in Image 1
  if (changePercent >= -0.3 && changePercent <= 0.3) {
    return {
      bg: isDark ? '#4b5563' : '#cbd5e1',
      text: isDark ? '#f3f4f6' : '#111827'
    };
  }

  if (changePercent > 0) {
    if (changePercent >= 12) {
      return { bg: isDark ? '#047857' : '#059669', text: '#ffffff' };
    }
    if (changePercent >= 7) {
      return { bg: isDark ? '#059669' : '#10b981', text: '#ffffff' };
    }
    if (changePercent >= 2.5) {
      return { bg: isDark ? '#10b981' : '#34d399', text: '#ffffff' };
    }
    return { bg: isDark ? '#22c55e' : '#4ade80', text: '#ffffff' };
  } else {
    const abs = Math.abs(changePercent);
    if (abs >= 12) {
      return { bg: isDark ? '#991b1b' : '#b91c1c', text: '#ffffff' };
    }
    if (abs >= 7) {
      return { bg: isDark ? '#dc2626' : '#ef4444', text: '#ffffff' };
    }
    if (abs >= 2.5) {
      return { bg: isDark ? '#ef4444' : '#f87171', text: '#ffffff' };
    }
    return { bg: isDark ? '#f87171' : '#fca5a5', text: isDark ? '#ffffff' : '#450a0a' };
  }
}

/**
 * Formats large market cap / volume numbers into T, B, M strings
 */
export function formatCompactNumber(val: number): string {
  if (!val || isNaN(val)) return '$0';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)} T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)} B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)} M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)} K`;
  return `$${val.toFixed(2)}`;
}

/**
 * Formats price according to magnitude
 */
export function formatHeatmapPrice(price: number): string {
  if (price === undefined || price === null || isNaN(price)) return '0.00';
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  if (price >= 0.01) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}
