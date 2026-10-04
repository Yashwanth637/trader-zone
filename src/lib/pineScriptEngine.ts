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

export interface IndicatorBoxOutput {
  id: string;
  leftTime: number;
  rightTime: number;
  top: number;
  bottom: number;
  color: string;
  borderColor: string;
  isResistance: boolean;
  isBreached: boolean;
  label?: string;
}

export interface IndicatorExecutionResult {
  success: boolean;
  error?: string;
  name: string;
  overlay: boolean;
  plots: IndicatorPlotOutput[];
  hlines: IndicatorHLineOutput[];
  boxes?: IndicatorBoxOutput[];
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
// Yashwanth's Indicator - Market Horizon Engine
// -------------------------------------------------------------

export const YASHWANTH_INDICATOR_CODE = `//@version=6
indicator("Yashwanth's Indicator", overlay=true, max_boxes_count=300)

// ==========================================
// 1. SYSTEM PARAMETERS
// ==========================================
var string G_PA   = "Market Horizon Filters"
pivot_len         = input.int(5, "Structural Sensitivity", minval=2, tooltip="Lower values map aggressive intermediate peaks and troughs perfectly.")
block_atr_mult    = input.float(0.4, "Base Zone Thickness (X * ATR)", minval=0.1, tooltip="Controls the standard thickness of the blocks.")
bars_ahead        = input.int(10, "Extension Past Live Price (Bars)", minval=1)
history_buffer    = input.int(1500, "Historical Storage Buffer (Bars)", minval=200)

var string G_VOL  = "Range Elimination Settings"
vol_length        = input.int(20, "Volume Profile Lookback", minval=10)
overlap_tolerance = input.float(1.2, "Anti-Stacking Range (X * ATR)", minval=0.5, tooltip="STRICT LIMIT: If any two zones get closer than this distance, they are forced to collapse into a single unified key level.")

var string G_COLOR = "Institutional Color Mapping"
color_res_block    = input.color(color.new(#00bcd4, 91), "Resistance Ceiling Fill")
color_res_border   = input.color(color.new(#00bcd4, 55), "Resistance Ceiling Border")
color_sup_block    = input.color(color.new(#ffeb3b, 92), "Support Floor Fill")
color_sup_border   = input.color(color.new(#ffeb3b, 60), "Support Floor Border")

// ==========================================
// 2. ADAPTIVE DATA CORE
// ==========================================
atr = ta.atr(14)
float base_block_height = atr * block_atr_mult
float strict_clearance  = atr * overlap_tolerance

// Pin coordinates strictly to candle bodies
body_high = math.max(open, close)
body_low  = math.min(open, close)

p_high = ta.pivothigh(body_high, pivot_len, pivot_len)
p_low  = ta.pivotlow(body_low, pivot_len, pivot_len)

// ==========================================
// 3. STORAGE REGISTRY WITH DE-STACKING LOGIC
// ==========================================
type HorizonZone
    box   visual_box
    float top_level
    float bottom_level
    bool  is_resistance
    int   origin_bar
    bool  is_breached

var HorizonZone[] zone_registry = array.new<HorizonZone>(0)

process_structural_horizon(float base_lvl, bool is_res) =>
    if (bar_index > last_bar_index - history_buffer)
        float t_val = is_res ? base_lvl : base_lvl + base_block_height
        float b_val = is_res ? base_lvl - base_block_height : base_lvl
        
        bool core_conflict = false
        
        if array.size(zone_registry) > 0
            for i = array.size(zone_registry) - 1 to 0
                HorizonZone z = array.get(zone_registry, i)
                
                if z.is_resistance == is_res and not z.is_breached
                    // Calculate absolute midpoints to track close proximity packing
                    float current_zone_mid = (z.top_level + z.bottom_level) / 2.0
                    float new_zone_mid     = (t_val + b_val) / 2.0
                    
                    // ANTI-STACKING RULE: If the new level is nesting inside or sitting directly against an old one
                    if math.abs(current_zone_mid - new_zone_mid) <= strict_clearance
                        // Forcibly collapse them together by averaging their positions, keeping the height locked to base_block_height
                        float balanced_mid = (current_zone_mid + new_zone_mid) / 2.0
                        
                        z.top_level    := is_res ? balanced_mid + (base_block_height / 2.0) : balanced_mid + (base_block_height / 2.0)
                        z.bottom_level := z.top_level - base_block_height
                        
                        // Update visual coordinates to display a clean, single baseline corridor
                        box.set_top(z.visual_box, z.top_level)
                        box.set_bottom(z.visual_box, z.bottom_level)
                        
                        core_conflict := true
                        break
                        
        if not core_conflict
            color f_color = is_res ? color_res_block : color_sup_block
            color b_color = is_res ? color_res_border : color_sup_border
            
            box b = box.new(left=bar_index - pivot_len, top=t_val, right=bar_index + bars_ahead, bottom=b_val,
              bgcolor=f_color, border_color=b_color, border_style=line.style_solid, extend=extend.none)
              
            array.push(zone_registry, HorizonZone.new(b, t_val, b_val, is_res, bar_index - pivot_len, false))

// Process discoveries symmetrically across highs and lows
if not na(p_high)
    process_structural_horizon(p_high, true)
if not na(p_low)
    process_structural_horizon(p_low, false)

// ==========================================
// 4. REAL-TIME RETRACTION & RUNWAY ENGINE
// ==========================================
if array.size(zone_registry) > 0
    for i = array.size(zone_registry) - 1 to 0
        HorizonZone z = array.get(zone_registry, i)
        
        if not z.is_breached
            bool break_res = z.is_resistance and close > z.top_level
            bool break_sup = not z.is_resistance and close < z.bottom_level
            
            if break_res or break_sup
                z.is_breached := true
                box.set_right(z.visual_box, bar_index)
            else
                box.set_right(z.visual_box, bar_index + bars_ahead)
                
        if z.origin_bar < bar_index - history_buffer
            box.delete(z.visual_box)
            array.remove(zone_registry, i)`;

export function executeYashwanthIndicator(code: string, candles: CandleData[]): IndicatorExecutionResult {
  if (!candles || candles.length === 0) {
    return {
      success: false,
      error: 'No candle data available',
      name: "Yashwanth's Indicator",
      overlay: true,
      plots: [],
      hlines: []
    };
  }

  // Parse parameters if modified in script
  let pivot_len = 5;
  const pMatch = code.match(/pivot_len\s*=\s*(?:input\.int\s*\(\s*)?(\d+)/);
  if (pMatch) pivot_len = Math.max(2, parseInt(pMatch[1], 10));

  let block_atr_mult = 0.4;
  const bMatch = code.match(/block_atr_mult\s*=\s*(?:input\.float\s*\(\s*)?([0-9.]+)/);
  if (bMatch) block_atr_mult = parseFloat(bMatch[1]);

  let bars_ahead = 10;
  const baMatch = code.match(/bars_ahead\s*=\s*(?:input\.int\s*\(\s*)?(\d+)/);
  if (baMatch) bars_ahead = parseInt(baMatch[1], 10);

  let overlap_tolerance = 1.2;
  const oMatch = code.match(/overlap_tolerance\s*=\s*(?:input\.float\s*\(\s*)?([0-9.]+)/);
  if (oMatch) overlap_tolerance = parseFloat(oMatch[1]);

  let history_buffer = 1500;
  const hMatch = code.match(/history_buffer\s*=\s*(?:input\.int\s*\(\s*)?(\d+)/);
  if (hMatch) history_buffer = parseInt(hMatch[1], 10);

  const atr = calculateATR(candles, 14);
  const body_high = candles.map(c => Math.max(c.open, c.close));
  const body_low = candles.map(c => Math.min(c.open, c.close));

  interface HorizonZoneInternal {
    id: string;
    top_level: number;
    bottom_level: number;
    is_resistance: boolean;
    origin_bar: number;
    end_bar: number;
    is_breached: boolean;
  }

  const zone_registry: HorizonZoneInternal[] = [];
  const n = candles.length;

  for (let bar_index = 0; bar_index < n; bar_index++) {
    const curAtr = atr[bar_index] || Math.max(candles[bar_index].high - candles[bar_index].low, 1.0);
    const base_block_height = curAtr * block_atr_mult;
    const strict_clearance = curAtr * overlap_tolerance;

    // Check pivot high at bar_index - pivot_len
    const p_idx = bar_index - pivot_len;
    if (p_idx >= pivot_len && p_idx < n - pivot_len) {
      let isHigh = true;
      for (let k = 1; k <= pivot_len; k++) {
        if (body_high[p_idx] <= body_high[p_idx - k] || body_high[p_idx] < body_high[p_idx + k]) {
          isHigh = false;
          break;
        }
      }

      if (isHigh) {
        const base_lvl = body_high[p_idx];
        const t_val = base_lvl;
        const b_val = base_lvl - base_block_height;

        let core_conflict = false;
        for (let i = zone_registry.length - 1; i >= 0; i--) {
          const z = zone_registry[i];
          if (z.is_resistance && !z.is_breached) {
            const current_zone_mid = (z.top_level + z.bottom_level) / 2.0;
            const new_zone_mid = (t_val + b_val) / 2.0;
            if (Math.abs(current_zone_mid - new_zone_mid) <= strict_clearance) {
              const balanced_mid = (current_zone_mid + new_zone_mid) / 2.0;
              z.top_level = balanced_mid + (base_block_height / 2.0);
              z.bottom_level = z.top_level - base_block_height;
              core_conflict = true;
              break;
            }
          }
        }

        if (!core_conflict) {
          zone_registry.push({
            id: `hz_res_${p_idx}_${zone_registry.length}`,
            top_level: t_val,
            bottom_level: b_val,
            is_resistance: true,
            origin_bar: p_idx,
            end_bar: bar_index + bars_ahead,
            is_breached: false
          });
        }
      }

      let isLow = true;
      for (let k = 1; k <= pivot_len; k++) {
        if (body_low[p_idx] >= body_low[p_idx - k] || body_low[p_idx] > body_low[p_idx + k]) {
          isLow = false;
          break;
        }
      }

      if (isLow) {
        const base_lvl = body_low[p_idx];
        const t_val = base_lvl + base_block_height;
        const b_val = base_lvl;

        let core_conflict = false;
        for (let i = zone_registry.length - 1; i >= 0; i--) {
          const z = zone_registry[i];
          if (!z.is_resistance && !z.is_breached) {
            const current_zone_mid = (z.top_level + z.bottom_level) / 2.0;
            const new_zone_mid = (t_val + b_val) / 2.0;
            if (Math.abs(current_zone_mid - new_zone_mid) <= strict_clearance) {
              const balanced_mid = (current_zone_mid + new_zone_mid) / 2.0;
              z.top_level = balanced_mid + (base_block_height / 2.0);
              z.bottom_level = z.top_level - base_block_height;
              core_conflict = true;
              break;
            }
          }
        }

        if (!core_conflict) {
          zone_registry.push({
            id: `hz_sup_${p_idx}_${zone_registry.length}`,
            top_level: t_val,
            bottom_level: b_val,
            is_resistance: false,
            origin_bar: p_idx,
            end_bar: bar_index + bars_ahead,
            is_breached: false
          });
        }
      }
    }

    // Real-time retraction
    const curClose = candles[bar_index].close;
    for (let i = zone_registry.length - 1; i >= 0; i--) {
      const z = zone_registry[i];
      if (!z.is_breached) {
        const break_res = z.is_resistance && curClose > z.top_level;
        const break_sup = !z.is_resistance && curClose < z.bottom_level;
        if (break_res || break_sup) {
          z.is_breached = true;
          z.end_bar = bar_index;
        } else {
          z.end_bar = bar_index + bars_ahead;
        }
      }
      if (z.origin_bar < bar_index - history_buffer) {
        zone_registry.splice(i, 1);
      }
    }
  }

  // Construct Visual Boxes
  const barDuration = n > 1 ? candles[1].time - candles[0].time : 60;
  const boxes: IndicatorBoxOutput[] = zone_registry.map(z => {
    const leftTime = candles[z.origin_bar]?.time || candles[0].time;
    let rightTime: number;
    if (z.end_bar < n) {
      rightTime = candles[z.end_bar]?.time || candles[n - 1].time;
    } else {
      rightTime = candles[n - 1].time + (z.end_bar - (n - 1)) * barDuration;
    }

    return {
      id: z.id,
      leftTime,
      rightTime,
      top: parseFloat(z.top_level.toFixed(4)),
      bottom: parseFloat(z.bottom_level.toFixed(4)),
      color: z.is_resistance ? 'rgba(0, 188, 212, 0.16)' : 'rgba(255, 235, 59, 0.18)',
      borderColor: z.is_resistance ? 'rgba(0, 188, 212, 0.75)' : 'rgba(255, 235, 59, 0.85)',
      isResistance: z.is_resistance,
      isBreached: z.is_breached,
      label: z.is_resistance ? 'RES CEILING' : 'SUP FLOOR'
    };
  });

  // Collect key active horizontal levels
  const hlines: IndicatorHLineOutput[] = [];
  const activeRes = zone_registry.filter(z => z.is_resistance && !z.is_breached).slice(-2);
  const activeSup = zone_registry.filter(z => !z.is_resistance && !z.is_breached).slice(-2);

  activeRes.forEach(r => {
    hlines.push({
      value: parseFloat(r.top_level.toFixed(2)),
      color: '#00bcd4',
      title: 'Res Ceiling'
    });
  });
  activeSup.forEach(s => {
    hlines.push({
      value: parseFloat(s.bottom_level.toFixed(2)),
      color: '#ffeb3b',
      title: 'Sup Floor'
    });
  });

  return {
    success: true,
    name: "Yashwanth's Indicator",
    overlay: true,
    plots: [],
    hlines,
    boxes
  };
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

  // Specialized dispatch for Yashwanth's Market Horizon Indicator
  if (
    code.includes('HorizonZone') ||
    code.includes('process_structural_horizon') ||
    code.toLowerCase().includes("yashwanth's indicator") ||
    code.toLowerCase().includes("yashwnth's indicator")
  ) {
    return executeYashwanthIndicator(code, candles);
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

        let seriesData = env[varName];
        if (typeof seriesData === 'number') {
          seriesData = new Array(candles.length).fill(seriesData);
        }

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

    if (plots.length === 0 && hlines.length === 0) {
      return {
        success: false,
        error:
          'Script parsed, but no plot() or hline() statements were found to display. To draw on the chart, add a plot() statement, e.g.: plot(close, "My Line", color=color.cyan) or hline(70).',
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
    id: 'builtin_yashwanth_indicator',
    name: "Yashwanth's Indicator",
    overlay: true,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    code: YASHWANTH_INDICATOR_CODE
  },
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
    const parsed: SavedPineScript[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...BUILT_IN_PINE_TEMPLATES];
    }
    // Always include latest built-in templates, plus user's custom saved scripts
    const userCustomOnly = parsed.filter(s => !s.isBuiltIn && !s.id.startsWith('builtin_'));
    return [...BUILT_IN_PINE_TEMPLATES, ...userCustomOnly];
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
