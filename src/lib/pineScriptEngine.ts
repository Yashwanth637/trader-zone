/**
 * Pine Script & Custom Indicator Execution Engine
 * Parses Pine Script indicators and computes series for Lightweight Charts
 */

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorPlotOutput {
  id: string;
  title: string;
  color: string;
  lineWidth?: number;
  overlay: boolean;
  data: Array<{ time: number; value: number }>;
}

export interface IndicatorHLineOutput {
  value: number;
  color: string;
  title?: string;
  lineStyle?: number;
}

export interface IndicatorExecutionResult {
  success: boolean;
  error?: string;
  name: string;
  overlay: boolean;
  plots: IndicatorPlotOutput[];
  hlines: IndicatorHLineOutput[];
}

export interface SavedPineScript {
  id: string;
  name: string;
  code: string;
  overlay: boolean;
  isBuiltIn?: boolean;
  updatedAt: string;
}

// -------------------------------------------------------------
// Math & Technical Analysis Core Algorithms
// -------------------------------------------------------------

export function calculateSMA(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= length) {
      sum -= data[i - length];
    }
    if (i >= length - 1) {
      result[i] = sum / length;
    }
  }
  return result;
}

export function calculateEMA(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const k = 2 / (length + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result[i] = null;
    } else if (i === length - 1) {
      // First EMA is simple average
      let sum = 0;
      for (let j = 0; j < length; j++) sum += data[j];
      prevEma = sum / length;
      result[i] = prevEma;
    } else if (prevEma !== null) {
      prevEma = data[i] * k + prevEma * (1 - k);
      result[i] = prevEma;
    }
  }
  return result;
}

export function calculateWMA(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const denom = (length * (length + 1)) / 2;

  for (let i = length - 1; i < data.length; i++) {
    let num = 0;
    for (let j = 0; j < length; j++) {
      num += data[i - (length - 1 - j)] * (j + 1);
    }
    result[i] = num / denom;
  }
  return result;
}

export function calculateRSI(data: number[], length: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length <= length) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / length;
  let avgLoss = losses / length;

  result[length] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = length + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (length - 1) + gain) / length;
    avgLoss = (avgLoss * (length - 1) + loss) / length;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }
  return result;
}

export function calculateBollingerBands(
  data: number[],
  length: number = 20,
  mult: number = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(data, length);
  const upper: (number | null)[] = new Array(data.length).fill(null);
  const lower: (number | null)[] = new Array(data.length).fill(null);

  for (let i = length - 1; i < data.length; i++) {
    const m = middle[i];
    if (m === null) continue;

    let variance = 0;
    for (let j = i - length + 1; j <= i; j++) {
      variance += Math.pow(data[j] - m, 2);
    }
    const stdDev = Math.sqrt(variance / length);
    upper[i] = m + mult * stdDev;
    lower[i] = m - mult * stdDev;
  }

  return { upper, middle, lower };
}

export function calculateATR(candles: CandleData[], length: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const trs: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trs.push(candles[i].high - candles[i].low);
    } else {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      trs.push(Math.max(hl, hc, lc));
    }
  }

  return calculateEMA(trs, length);
}

export function calculateHighest(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  for (let i = length - 1; i < data.length; i++) {
    let max = -Infinity;
    for (let j = i - length + 1; j <= i; j++) {
      if (data[j] > max) max = data[j];
    }
    result[i] = max;
  }
  return result;
}

export function calculateLowest(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  for (let i = length - 1; i < data.length; i++) {
    let min = Infinity;
    for (let j = i - length + 1; j <= i; j++) {
      if (data[j] < min) min = data[j];
    }
    result[i] = min;
  }
  return result;
}

// -------------------------------------------------------------
// Color Parser Helper
// -------------------------------------------------------------

function resolvePineColor(colorStr?: string, defaultColor: string = '#38bdf8'): string {
  if (!colorStr) return defaultColor;
  const c = colorStr.trim().toLowerCase();

  const colorMap: Record<string, string> = {
    'color.blue': '#3b82f6',
    'color.orange': '#f97316',
    'color.green': '#22c55e',
    'color.red': '#ef4444',
    'color.purple': '#a855f7',
    'color.yellow': '#eab308',
    'color.cyan': '#06b6d4',
    'color.teal': '#14b8a6',
    'color.white': '#ffffff',
    'color.gray': '#94a3b8',
    'color.silver': '#cbd5e1',
    'color.navy': '#1e3a8a',
    'color.maroon': '#881337',
    'blue': '#3b82f6',
    'orange': '#f97316',
    'green': '#22c55e',
    'red': '#ef4444',
    'purple': '#a855f7',
    'yellow': '#eab308',
    'cyan': '#06b6d4',
    'white': '#ffffff'
  };

  if (colorMap[c]) return colorMap[c];
  if (c.startsWith('#') || c.startsWith('rgb')) return colorStr.trim();
  return defaultColor;
}

// -------------------------------------------------------------
// Pine Script Parser & Execution Engine
// -------------------------------------------------------------

export function executePineScript(code: string, candles: CandleData[]): IndicatorExecutionResult {
  if (!candles || candles.length === 0) {
    return {
      success: false,
      error: 'No market candle data available to calculate indicator',
      name: 'Custom Indicator',
      overlay: true,
      plots: [],
      hlines: []
    };
  }

  try {
    const lines = code.split('\n');
    let indicatorName = 'Custom Indicator';
    let isOverlay = true;

    // Price Series Vectors
    const close = candles.map(c => c.close);
    const open = candles.map(c => c.open);
    const high = candles.map(c => c.high);
    const low = candles.map(c => c.low);
    const volume = candles.map(c => c.volume || 0);
    const hl2 = candles.map(c => (c.high + c.low) / 2);
    const hlc3 = candles.map(c => (c.high + c.low + c.close) / 3);
    const ohlc4 = candles.map(c => (c.open + c.high + c.low + c.close) / 4);

    // Variable Environment
    const env: Record<string, any> = {
      close,
      open,
      high,
      low,
      volume,
      hl2,
      hlc3,
      ohlc4
    };

    const plots: IndicatorPlotOutput[] = [];
    const hlines: IndicatorHLineOutput[] = [];
    let plotCount = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let rawLine = lines[lineIndex].trim();
      // Strip comments
      if (rawLine.startsWith('//') || rawLine.length === 0) continue;
      const commentIdx = rawLine.indexOf('//');
      if (commentIdx !== -1) rawLine = rawLine.substring(0, commentIdx).trim();

      // Check indicator declaration: indicator("Name", overlay=true)
      const indicatorMatch = rawLine.match(/(?:indicator|study)\s*\(\s*["']([^"']+)["'](?:\s*,\s*overlay\s*=\s*(true|false))?/i);
      if (indicatorMatch) {
        indicatorName = indicatorMatch[1];
        if (indicatorMatch[2]) {
          isOverlay = indicatorMatch[2].toLowerCase() === 'true';
        }
        continue;
      }

      // Check hline: hline(70, "Overbought", color=color.red)
      const hlineMatch = rawLine.match(/hline\s*\(\s*([0-9.-]+)(?:\s*,\s*["']?([^"',)]*)["']?)?(?:\s*,\s*color\s*=\s*([^,)]+))?/i);
      if (hlineMatch) {
        const val = parseFloat(hlineMatch[1]);
        const title = hlineMatch[2] || `${val}`;
        const color = resolvePineColor(hlineMatch[3], '#ef4444');
        hlines.push({ value: val, title, color });
        continue;
      }

      // Check plot: plot(ema20, "EMA 20", color=color.blue, linewidth=2)
      const plotMatch = rawLine.match(/plot\s*\(\s*([a-zA-Z0-9_.-]+)(?:\s*,\s*(?:title\s*=\s*)?["']([^"']+)["'])?(?:\s*,\s*(?:color\s*=\s*)?([a-zA-Z0-9_#.-]+))?(?:\s*,\s*(?:linewidth\s*=\s*)?(\d+))?/i);
      if (plotMatch) {
        const varName = plotMatch[1].trim();
        const plotTitle = plotMatch[2] || `Plot ${plotCount + 1}`;
        const plotColor = resolvePineColor(plotMatch[3], plotCount % 2 === 0 ? '#38bdf8' : '#f59e0b');
        const lineWidth = plotMatch[4] ? parseInt(plotMatch[4], 10) : 2;

        const seriesData = env[varName];
        if (Array.isArray(seriesData)) {
          const plotPoints: Array<{ time: number; value: number }> = [];
          for (let i = 0; i < seriesData.length; i++) {
            const v = seriesData[i];
            if (v !== null && v !== undefined && !isNaN(v)) {
              plotPoints.push({
                time: candles[i].time,
                value: parseFloat(v.toFixed(4))
              });
            }
          }

          plots.push({
            id: `plot_${plotCount++}_${varName}`,
            title: plotTitle,
            color: plotColor,
            lineWidth,
            overlay: isOverlay,
            data: plotPoints
          });
        }
        continue;
      }

      // Variable Assignment parsing: varName = expression
      const assignMatch = rawLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1].trim();
        const expr = assignMatch[2].trim();

        // Check ta.sma(source, length)
        const smaMatch = expr.match(/ta\.sma\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(\d+)\s*\)/i);
        if (smaMatch) {
          const src = env[smaMatch[1].toLowerCase()] || close;
          const len = parseInt(smaMatch[2], 10);
          env[varName] = calculateSMA(src, len);
          continue;
        }

        // Check ta.ema(source, length)
        const emaMatch = expr.match(/ta\.ema\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(\d+)\s*\)/i);
        if (emaMatch) {
          const src = env[emaMatch[1].toLowerCase()] || close;
          const len = parseInt(emaMatch[2], 10);
          env[varName] = calculateEMA(src, len);
          continue;
        }

        // Check ta.wma(source, length)
        const wmaMatch = expr.match(/ta\.wma\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(\d+)\s*\)/i);
        if (wmaMatch) {
          const src = env[wmaMatch[1].toLowerCase()] || close;
          const len = parseInt(wmaMatch[2], 10);
          env[varName] = calculateWMA(src, len);
          continue;
        }

        // Check ta.rsi(source, length)
        const rsiMatch = expr.match(/ta\.rsi\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(\d+)\s*\)/i);
        if (rsiMatch) {
          const src = env[rsiMatch[1].toLowerCase()] || close;
          const len = parseInt(rsiMatch[2], 10);
          env[varName] = calculateRSI(src, len);
          continue;
        }

        // Check ta.atr(length)
        const atrMatch = expr.match(/ta\.atr\s*\(\s*(\d+)\s*\)/i);
        if (atrMatch) {
          const len = parseInt(atrMatch[1], 10);
          env[varName] = calculateATR(candles, len);
          continue;
        }

        // Check ta.highest(source, length)
        const highestMatch = expr.match(/ta\.highest\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(\d+)\s*\)/i);
        if (highestMatch) {
          const src = env[highestMatch[1].toLowerCase()] || high;
          const len = parseInt(highestMatch[2], 10);
          env[varName] = calculateHighest(src, len);
          continue;
        }

        // Check ta.lowest(source, length)
        const lowestMatch = expr.match(/ta\.lowest\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(\d+)\s*\)/i);
        if (lowestMatch) {
          const src = env[lowestMatch[1].toLowerCase()] || low;
          const len = parseInt(lowestMatch[2], 10);
          env[varName] = calculateLowest(src, len);
          continue;
        }

        // Check Bollinger Bands: [upper, middle, lower] = ta.bb(close, 20, 2)
        const bbMatch = expr.match(/ta\.bb\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)/i);
        if (bbMatch) {
          const src = env[bbMatch[1].toLowerCase()] || close;
          const len = parseInt(bbMatch[2], 10);
          const mult = bbMatch[3] ? parseFloat(bbMatch[3]) : 2;
          const bb = calculateBollingerBands(src, len, mult);
          env[`${varName}_upper`] = bb.upper;
          env[`${varName}_middle`] = bb.middle;
          env[`${varName}_lower`] = bb.lower;
          env[varName] = bb.middle;
          continue;
        }

        // Simple arithmetic or numeric constant:
        const numVal = parseFloat(expr);
        if (!isNaN(numVal)) {
          env[varName] = numVal;
          continue;
        }
      }
    }

    if (plots.length === 0) {
      return {
        success: false,
        error: 'Script compiled, but no plot() statements were found to display.',
        name: indicatorName,
        overlay: isOverlay,
        plots: [],
        hlines
      };
    }

    return {
      success: true,
      name: indicatorName,
      overlay: isOverlay,
      plots,
      hlines
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Pine Script Execution Error: ${err?.message || 'Unknown syntax error'}`,
      name: 'Custom Indicator',
      overlay: true,
      plots: [],
      hlines: []
    };
  }
}

// -------------------------------------------------------------
// Built-in Template Scripts Library
// -------------------------------------------------------------

export const BUILT_IN_PINE_TEMPLATES: SavedPineScript[] = [
  {
    id: 'builtin_ema_ribbon',
    name: 'EMA Ribbon (20, 50, 200)',
    overlay: true,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    code: `//@version=5
indicator("EMA Ribbon Trend", overlay=true)

// Calculations
ema20 = ta.ema(close, 20)
ema50 = ta.ema(close, 50)
ema200 = ta.ema(close, 200)

// Plots
plot(ema20, "Fast EMA 20", color=color.cyan, linewidth=2)
plot(ema50, "Medium EMA 50", color=color.orange, linewidth=2)
plot(ema200, "Base EMA 200", color=color.purple, linewidth=2)`
  },
  {
    id: 'builtin_rsi_oscillator',
    name: 'RSI Oscillator (14)',
    overlay: false,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    code: `//@version=5
indicator("Relative Strength Index", overlay=false)

// Calculation
rsi14 = ta.rsi(close, 14)

// Horizontal Reference Levels
hline(70, "Overbought", color=color.red)
hline(50, "Neutral", color=color.gray)
hline(30, "Oversold", color=color.green)

// Plot
plot(rsi14, "RSI (14)", color=color.purple, linewidth=2)`
  },
  {
    id: 'builtin_bollinger_bands',
    name: 'Bollinger Bands (20, 2)',
    overlay: true,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    code: `//@version=5
indicator("Bollinger Bands Volatility", overlay=true)

// Calculations
bb = ta.bb(close, 20, 2)

// Plots
plot(bb_upper, "Upper Band", color=color.blue, linewidth=1)
plot(bb_middle, "Basis (SMA 20)", color=color.orange, linewidth=1)
plot(bb_lower, "Lower Band", color=color.blue, linewidth=1)`
  },
  {
    id: 'builtin_supertrend_atr',
    name: 'ATR Volatility Filter (14)',
    overlay: false,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    code: `//@version=5
indicator("Average True Range", overlay=false)

// Calculation
atr14 = ta.atr(14)

// Plot
plot(atr14, "ATR (14)", color=color.yellow, linewidth=2)`
  }
];

// -------------------------------------------------------------
// Per-User Script Storage Helpers
// -------------------------------------------------------------

export function getUserSavedPineScripts(userId?: string): SavedPineScript[] {
  const key = `tz_user_pinescripts_${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [...BUILT_IN_PINE_TEMPLATES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...BUILT_IN_PINE_TEMPLATES];
  } catch {
    return [...BUILT_IN_PINE_TEMPLATES];
  }
}

export function saveUserPineScripts(scripts: SavedPineScript[], userId?: string): void {
  const key = `tz_user_pinescripts_${userId || 'guest'}`;
  try {
    localStorage.setItem(key, JSON.stringify(scripts));
  } catch (e) {
    console.error('Failed to save Pine scripts:', e);
  }
}
