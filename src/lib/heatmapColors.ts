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
  { percent: -13, bgDark: '#751a23', bgLight: '#7f1d1d', textDark: '#ffffff', textLight: '#ffffff' },
  { percent: -8,  bgDark: '#992430', bgLight: '#a32936', textDark: '#ffffff', textLight: '#ffffff' },
  { percent: -3,  bgDark: '#b33642', bgLight: '#be3c49', textDark: '#ffffff', textLight: '#ffffff' },
  { percent: 0,   bgDark: '#475569', bgLight: '#cbd5e1', textDark: '#ffffff', textLight: '#0f172a' },
  { percent: 3,   bgDark: '#16a34a', bgLight: '#16a34a', textDark: '#ffffff', textLight: '#ffffff' },
  { percent: 8,   bgDark: '#059669', bgLight: '#059669', textDark: '#ffffff', textLight: '#ffffff' },
  { percent: 13,  bgDark: '#047857', bgLight: '#047857', textDark: '#ffffff', textLight: '#ffffff' },
];

/**
 * Returns exact background color for a given percentage change
 * Carefully calibrated with dimmed, sophisticated red tones for negative performance
 */
export function getHeatmapTileColor(changePercent: number, isDark: boolean = true): { bg: string; text: string } {
  // If virtually zero (-0.3% to +0.3%), render neutral slate grey like Bitcoin (+0.10%) in Image 1
  if (changePercent >= -0.3 && changePercent <= 0.3) {
    return {
      bg: isDark ? '#475569' : '#cbd5e1',
      text: isDark ? '#f8fafc' : '#0f172a'
    };
  }

  if (changePercent > 0) {
    if (changePercent >= 10) {
      return { bg: isDark ? '#047857' : '#047857', text: '#ffffff' };
    }
    if (changePercent >= 5) {
      return { bg: isDark ? '#059669' : '#059669', text: '#ffffff' };
    }
    if (changePercent >= 2) {
      return { bg: isDark ? '#10b981' : '#15803d', text: '#ffffff' };
    }
    // Mild positive (0.3% to 2%): In light mode use rich green #16a34a so white text is crisp and bold
    return { bg: isDark ? '#16a34a' : '#16a34a', text: '#ffffff' };
  } else {
    const abs = Math.abs(changePercent);
    if (abs >= 10) {
      return { bg: isDark ? '#751a23' : '#7f1d1d', text: '#ffffff' };
    }
    if (abs >= 5) {
      return { bg: isDark ? '#992430' : '#a32936', text: '#ffffff' };
    }
    if (abs >= 2) {
      return { bg: isDark ? '#b33642' : '#be3c49', text: '#ffffff' };
    }
    // Mild negative (-0.3% to -2%): Soft, dimmed coral red (matches TradingView & MetaDAO screenshot)
    return { bg: isDark ? '#c54954' : '#d9535f', text: '#ffffff' };
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
