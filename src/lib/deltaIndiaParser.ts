import { Trade, Direction, AssetClass } from '../types/trade';
import { detectTradingSession, calculatePips, sortTradesDescending } from './calculations';

/**
 * Universal date parser supporting:
 * - Delta Exchange India timestamps with trailing timezone regions (e.g. 2026-10-15 05:41:55.677201+05:30 IST Asia/Kolkata)
 * - ISO 8601 with fractional seconds and offsets (2026-10-15T05:41:55.677+05:30 or Z)
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * - DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, MM/DD/YYYY
 * - Unix timestamps (epoch ms or seconds)
 */
export function parseUniversalDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  let trimmed = dateStr.trim();

  // Strip named timezone trailing words like "IST Asia/Kolkata", "UTC", etc. while keeping numeric offset +05:30 or Z
  trimmed = trimmed.replace(/\s+[A-Za-z/_-]+(?:\s+[A-Za-z/_-]+)*$/, '').trim();

  // 1. ISO / YMD with optional time, fractional seconds, and timezone offset
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?([+-]\d{2}:?\d{2}|Z)?/);
  if (isoMatch) {
    const yr = isoMatch[1];
    const mo = isoMatch[2].padStart(2, '0');
    const da = isoMatch[3].padStart(2, '0');
    const hr = isoMatch[4].padStart(2, '0');
    const mi = isoMatch[5].padStart(2, '0');
    const se = isoMatch[6] || '00';
    const tz = isoMatch[7] || '';
    if (tz) {
      const formattedTz = tz.includes(':') || tz === 'Z' ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`;
      const fullIso = `${yr}-${mo}-${da}T${hr}:${mi}:${se}${formattedTz}`;
      const d = new Date(fullIso);
      if (!isNaN(d.getTime())) return d;
    } else {
      const secFloat = parseFloat(se);
      const second = Math.floor(secFloat);
      const ms = Math.round((secFloat % 1) * 1000);
      const d = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, parseInt(da, 10), parseInt(hr, 10), parseInt(mi, 10), second, ms);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 2. YYYY-MM-DD date only
  const ymdOnly = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdOnly) {
    return new Date(parseInt(ymdOnly[1], 10), parseInt(ymdOnly[2], 10) - 1, parseInt(ymdOnly[3], 10));
  }

  // 3. DD-MM-YYYY or MM-DD-YYYY with optional time
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?)?/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const secFloat = dmyMatch[6] ? parseFloat(dmyMatch[6]) : 0;
    const second = Math.floor(secFloat);
    const ms = Math.round((secFloat % 1) * 1000);

    let day = p1;
    let month = p2 - 1;
    if (p1 <= 12 && p2 > 12) {
      // US format MM/DD/YYYY
      month = p1 - 1;
      day = p2;
    }
    return new Date(year, month, day, hour, minute, second, ms);
  }

  // 4. Unix timestamp (epoch ms or seconds)
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return new Date(num > 1e11 ? num : num * 1000);
  }

  // 5. Fallback standard Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date();
}

/**
 * Format a Date object into DD-MM-YYYY (e.g., 04-09-2026)
 */
export function formatDDMMYYYY(dateObj: Date): string {
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}-${m}-${y}`;
}

/**
 * Clean numeric string handling scientific notation (0E-18), currency signs, commas, and NaNs
 */
export function cleanNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/["'\s$₹€,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * Detect if CSV text belongs to Delta Exchange India Order History
 */
export function isDeltaIndiaCsv(csvText: string): boolean {
  if (!csvText || typeof csvText !== 'string') return false;
  const firstLines = csvText.slice(0, 2500).toLowerCase();
  const hasContract = firstLines.includes('contract');
  const hasDeltaKeywords =
    (firstLines.includes('filled/remaining') || firstLines.includes('order type') || firstLines.includes('exec.price') || firstLines.includes('cashflow')) &&
    (firstLines.includes('realised p&l') || firstLines.includes('realized p&l') || firstLines.includes('trading fees') || firstLines.includes('cashflow'));

  return hasContract && hasDeltaKeywords;
}

interface RawDeltaOrder {
  dateObj: Date;
  ts: number;
  isoTime: string;
  displayDate: string;
  contract: string;
  rawQty: number;
  lotSize: number;
  side: 'buy' | 'sell';
  execPrice: number;
  stopPrice?: number;
  orderPrice?: number;
  fee: number;
  pnl: number;
  cashflow: number;
  orderId: string;
  status: string;
  explanation: string;
}

interface RawBracketOrder {
  dateObj: Date;
  ts: number;
  contract: string;
  qty: number;
  side: 'buy' | 'sell';
  stopPrice?: number;
  orderPrice?: number;
  explanation: string;
}

/**
 * Specialized parser for Delta Exchange India Order History CSV.
 * - Dynamic column header resolution (never breaks on column reordering or missing optional columns).
 * - Filters out duplicate headers from merged statement exports.
 * - Captures both executed fills and conditional bracket trigger orders (SL / TP).
 * - Computes Planned R:R and Realized R:R.
 * - Handles fractional lot sizes and contract conversions (/ 1000).
 * - Stores dates in DD-MM-YYYY format and ISO timestamps with timezone preservation.
 * - Accurately pairs opening & closing round-trip positions (including breakeven trades).
 */
export function parseDeltaIndiaCsv(csvText: string, accountId: string): Trade[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Determine line delimiter (comma, semicolon, tab)
  const firstLine = lines[0] || '';
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';

  // Locate the initial header row
  let headerCols: string[] = [];
  let headerLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].toLowerCase();
    if (row.includes('contract') && (row.includes('realised') || row.includes('realized') || row.includes('fees') || row.includes('price'))) {
      headerCols = lines[i].split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim().toLowerCase());
      headerLineIndex = i;
      break;
    }
  }

  // Fallback to first line if no special header row was detected
  if (headerLineIndex === -1) {
    headerCols = lines[0].split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim().toLowerCase());
    headerLineIndex = 0;
  }

  const getCol = (names: string[]): number => {
    for (const name of names) {
      const idx = headerCols.indexOf(name);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  let colTime = getCol(['time', 'date', 'created at', 'timestamp', 'datetime']);
  let colContract = getCol(['contract', 'symbol', 'instrument', 'asset']);
  let colQty = getCol(['qty', 'quantity', 'size', 'volume', 'lots']);
  let colSide = getCol(['side', 'type', 'direction']);
  let colFilled = getCol(['filled/remaining', 'filled', 'executed qty']);
  let colExecPrice = getCol(['exec.price', 'exec price', 'fill price', 'avg price', 'execution price', 'price']);
  let colOrderPrice = getCol(['order price', 'limit price']);
  let colStopPrice = getCol(['stop price', 'trigger price', 'stop']);
  let colFees = getCol(['trading fees', 'fee', 'fees', 'commission']);
  let colCashflow = getCol(['cashflow']);
  let colRealisedPnl = getCol(['realised p&l', 'realized p&l', 'realised pnl', 'realized pnl', 'p&l', 'profit']);
  let colNetPnl = getCol(['net p&l', 'net pnl', 'net profit']);
  let colOrderType = getCol(['order type']);
  let colStatus = getCol(['status', 'state', 'order status']);
  let colExplanation = getCol(['explanation', 'reason', 'remarks']);
  let colOrderId = getCol(['order id', 'client order id', 'id']);

  // Sensible default fallbacks for standard Delta India layout if missing from header:
  if (colTime === -1) colTime = 0;
  if (colContract === -1) colContract = 1;
  if (colQty === -1) colQty = 2;
  if (colSide === -1) colSide = 3;
  if (colFilled === -1) colFilled = 4;
  if (colExecPrice === -1) colExecPrice = 5;
  if (colOrderPrice === -1) colOrderPrice = 6;
  if (colStopPrice === -1) colStopPrice = 7;
  if (colFees === -1) colFees = 9;
  if (colCashflow === -1) colCashflow = 10;
  if (colRealisedPnl === -1) colRealisedPnl = 11;
  if (colNetPnl === -1) colNetPnl = 12;
  if (colOrderType === -1) colOrderType = 13;
  if (colStatus === -1) colStatus = 14;
  if (colExplanation === -1) colExplanation = 15;
  if (colOrderId === -1) colOrderId = 17;

  const validRows: RawDeltaOrder[] = [];
  const bracketOrders: RawBracketOrder[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (i === headerLineIndex) continue;
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length < 4) continue;

    // Check if this row is a repeated header (e.g. from merged files)
    const timeVal = (cols[colTime] || '').toLowerCase();
    const contractVal = (cols[colContract] || '').toLowerCase();
    if (timeVal === 'time' || timeVal === 'date' || contractVal === 'contract' || contractVal === 'symbol') {
      headerCols = cols.map(c => c.toLowerCase());
      continue;
    }

    const status = (cols[colStatus] || '').toLowerCase();
    const explanation = (cols[colExplanation] || '').toLowerCase();
    const rawTime = cols[colTime] || '';
    const parsedDate = parseUniversalDate(rawTime);
    const contract = (cols[colContract] || 'CRYPTO').toUpperCase();
    const rawQty = cleanNumber(cols[colQty]);
    // Divide contract count by 1000 for standard lot sizing if >= 1
    const lotSize = rawQty >= 1 ? parseFloat((rawQty / 1000).toFixed(5)) : rawQty;
    const side = (cols[colSide] || '').toLowerCase() === 'sell' ? 'sell' : 'buy';
    const execPrice = colExecPrice !== -1 ? cleanNumber(cols[colExecPrice], NaN) : NaN;
    const orderPrice = colOrderPrice !== -1 ? cleanNumber(cols[colOrderPrice], NaN) : NaN;
    const stopPrice = colStopPrice !== -1 ? cleanNumber(cols[colStopPrice], NaN) : NaN;
    const triggerPrice = !isNaN(stopPrice) && stopPrice > 0 ? stopPrice : !isNaN(orderPrice) && orderPrice > 0 ? orderPrice : undefined;
    const fee = colFees !== -1 ? cleanNumber(cols[colFees]) : 0;
    const pnl = colRealisedPnl !== -1 ? cleanNumber(cols[colRealisedPnl]) : 0;
    const cashflow = colCashflow !== -1 ? cleanNumber(cols[colCashflow]) : 0;
    const orderId = (colOrderId !== -1 && cols[colOrderId]) ? cols[colOrderId] : `DELTA-${i}`;

    // Conditional bracket trigger orders (SL / TP cancelled on position close)
    const isCancelledBracket =
      status === 'cancelled' ||
      status === 'rejected' ||
      explanation.includes('position_closed') ||
      explanation.includes('cancelled_by_user') ||
      explanation.includes('tp_trigger') ||
      explanation.includes('sl_trigger');

    if (triggerPrice && isCancelledBracket) {
      bracketOrders.push({
        dateObj: parsedDate,
        ts: parsedDate.getTime(),
        contract,
        qty: rawQty,
        side,
        stopPrice: triggerPrice,
        orderPrice: !isNaN(orderPrice) ? orderPrice : undefined,
        explanation
      });
    }

    // Executed orders
    const filled = colFilled !== -1 ? (cols[colFilled] || '') : '';
    const isExecuted =
      (status === 'closed' || status === 'filled') &&
      !isNaN(execPrice) &&
      execPrice > 0 &&
      !filled.startsWith('0.00/');

    if (isExecuted) {
      validRows.push({
        dateObj: parsedDate,
        ts: parsedDate.getTime(),
        isoTime: parsedDate.toISOString(),
        displayDate: formatDDMMYYYY(parsedDate),
        contract,
        rawQty,
        lotSize,
        side,
        execPrice,
        stopPrice: !isNaN(stopPrice) ? stopPrice : undefined,
        orderPrice: !isNaN(orderPrice) ? orderPrice : undefined,
        fee,
        pnl,
        cashflow,
        orderId,
        status,
        explanation
      });
    }
  }

  // Sort chronologically (oldest first)
  validRows.sort((a, b) => a.ts - b.ts);

  // Pairing order queues
  const openLongs: Record<string, RawDeltaOrder[]> = {};
  const openShorts: Record<string, RawDeltaOrder[]> = {};
  const trades: Trade[] = [];

  for (const order of validRows) {
    const sym = order.contract;
    if (!openLongs[sym]) openLongs[sym] = [];
    if (!openShorts[sym]) openShorts[sym] = [];

    // Determine asset class
    let assetClass: AssetClass = 'Crypto';
    if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('OIL') || sym.includes('SILVER')) {
      assetClass = 'Commodities';
    } else if (sym.includes('NIFTY') || sym.includes('BANKNIFTY') || sym.includes('SPX') || sym.includes('US30') || sym.includes('NAS')) {
      assetClass = 'Indices';
    }

    // Determine if this order is closing a position:
    // 1. In Delta India, closing fills have realised P&L !== 0 or cashflow !== 0
    // 2. OR opposite side order exists in queue (handles breakeven PnL === 0)
    const hasOpenLongs = openLongs[sym].length > 0;
    const hasOpenShorts = openShorts[sym].length > 0;
    const isClosingSell = order.side === 'sell' && (order.pnl !== 0 || order.cashflow !== 0 || hasOpenLongs);
    const isClosingBuy = order.side === 'buy' && (order.pnl !== 0 || order.cashflow !== 0 || hasOpenShorts);

    if (isClosingSell || isClosingBuy) {
      // CLOSING ORDER
      const direction: Direction = isClosingSell ? 'BUY' : 'SELL';
      const queue = isClosingSell ? openLongs[sym] : openShorts[sym];

      let matchIdx = queue.findIndex(o => Math.abs(o.rawQty - order.rawQty) < 0.001);
      if (matchIdx === -1 && queue.length > 0) matchIdx = 0;
      const openOrder = matchIdx !== -1 && queue.length > 0 ? queue.splice(matchIdx, 1)[0] : undefined;

      const entryPrice = openOrder ? openOrder.execPrice : order.execPrice;
      const exitPrice = order.execPrice;
      const openTime = openOrder ? openOrder.isoTime : order.isoTime;
      const closeTime = order.isoTime;
      const commission = (openOrder ? openOrder.fee : 0) + order.fee;

      // Find any bracket trigger orders around close time or open time (+/- 30 seconds)
      const matchingBrackets = bracketOrders.filter(b => 
        b.contract === sym && (
          Math.abs(b.ts - order.ts) <= 30000 ||
          (openOrder && Math.abs(b.ts - openOrder.ts) <= 30000)
        )
      );

      // Aggregate all potential trigger prices from closing order, open order, and bracket cancellations
      const candidatePrices: number[] = [];
      if (order.stopPrice && !isNaN(order.stopPrice) && order.stopPrice > 0) candidatePrices.push(order.stopPrice);
      if (openOrder?.stopPrice && !isNaN(openOrder.stopPrice) && openOrder.stopPrice > 0) candidatePrices.push(openOrder.stopPrice);
      matchingBrackets.forEach(b => {
        if (b.stopPrice && !isNaN(b.stopPrice) && b.stopPrice > 0) candidatePrices.push(b.stopPrice);
      });

      let stopLoss: number | undefined = undefined;
      let takeProfit: number | undefined = undefined;

      if (direction === 'BUY') {
        // For BUY (Long): SL is below entry, TP is above entry
        const lowerPrices = candidatePrices.filter(p => p < entryPrice);
        const higherPrices = candidatePrices.filter(p => p > entryPrice);
        if (lowerPrices.length > 0) stopLoss = Math.max(...lowerPrices);
        if (higherPrices.length > 0) takeProfit = Math.min(...higherPrices);
      } else {
        // For SELL (Short): SL is above entry, TP is below entry
        const higherPrices = candidatePrices.filter(p => p > entryPrice);
        const lowerPrices = candidatePrices.filter(p => p < entryPrice);
        if (higherPrices.length > 0) stopLoss = Math.min(...higherPrices);
        if (lowerPrices.length > 0) takeProfit = Math.max(...lowerPrices);
      }

      // Compute planned R:R
      let plannedRR: number | undefined = undefined;
      if (stopLoss && takeProfit) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        if (risk > 0) {
          plannedRR = parseFloat((reward / risk).toFixed(2));
        }
      }

      // Compute realized R:R
      let realizedRR: number | undefined = undefined;
      if (stopLoss) {
        const risk = Math.abs(entryPrice - stopLoss);
        if (risk > 0) {
          const gain = direction === 'BUY' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
          realizedRR = parseFloat((gain / risk).toFixed(2));
        }
      }

      const durationMinutes = Math.max(
        1,
        Math.round((new Date(closeTime).getTime() - new Date(openTime).getTime()) / (1000 * 60))
      );

      const netPnl = parseFloat(order.pnl.toFixed(4));
      const grossPnl = parseFloat((order.pnl + commission).toFixed(4));

      trades.push({
        id: `delta-${order.orderId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ticket: order.orderId,
        accountId,
        symbol: sym,
        assetClass,
        direction,
        status: 'CLOSED',
        lotSize: order.lotSize,
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        plannedRR,
        realizedRR,
        openTime,
        closeTime,
        grossPnl,
        commission: parseFloat(commission.toFixed(4)),
        swap: 0,
        netPnl,
        pips: calculatePips(sym, direction, entryPrice, exitPrice),
        durationMinutes,
        session: detectTradingSession(openTime),
        setupTags: ['Delta Exchange India'],
        mistakeTags: [],
        notes: `Delta India | Date: ${order.displayDate} | Lots: ${order.lotSize} | Entry: ${entryPrice} | Exit: ${exitPrice}${stopLoss ? ` | SL: ${stopLoss}` : ''}${takeProfit ? ` | TP: ${takeProfit}` : ''}`,
        executionRating: netPnl > 0 ? 5 : 3
      });
    } else {
      // OPENING ORDER
      if (order.side === 'buy') {
        openLongs[sym].push(order);
      } else {
        openShorts[sym].push(order);
      }
    }
  }

  // Handle any remaining open positions (e.g. active trades still open on Delta)
  Object.keys(openLongs).forEach(sym => {
    openLongs[sym].forEach(openOrder => {
      trades.push({
        id: `delta-${openOrder.orderId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ticket: openOrder.orderId,
        accountId,
        symbol: sym,
        assetClass: sym.includes('XAU') ? 'Commodities' : 'Crypto',
        direction: 'BUY',
        status: 'OPEN',
        lotSize: openOrder.lotSize,
        entryPrice: openOrder.execPrice,
        openTime: openOrder.isoTime,
        commission: parseFloat(openOrder.fee.toFixed(4)),
        swap: 0,
        netPnl: 0,
        session: detectTradingSession(openOrder.isoTime),
        setupTags: ['Delta Exchange India', 'Open Position'],
        mistakeTags: [],
        notes: `Delta India (Active Open Long) | Date: ${openOrder.displayDate} | Lots: ${openOrder.lotSize} | Entry: ${openOrder.execPrice}`
      });
    });
  });

  Object.keys(openShorts).forEach(sym => {
    openShorts[sym].forEach(openOrder => {
      trades.push({
        id: `delta-${openOrder.orderId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ticket: openOrder.orderId,
        accountId,
        symbol: sym,
        assetClass: sym.includes('XAU') ? 'Commodities' : 'Crypto',
        direction: 'SELL',
        status: 'OPEN',
        lotSize: openOrder.lotSize,
        entryPrice: openOrder.execPrice,
        openTime: openOrder.isoTime,
        commission: parseFloat(openOrder.fee.toFixed(4)),
        swap: 0,
        netPnl: 0,
        session: detectTradingSession(openOrder.isoTime),
        setupTags: ['Delta Exchange India', 'Open Position'],
        mistakeTags: [],
        notes: `Delta India (Active Open Short) | Date: ${openOrder.displayDate} | Lots: ${openOrder.lotSize} | Entry: ${openOrder.execPrice}`
      });
    });
  });

  return sortTradesDescending(trades);
}
