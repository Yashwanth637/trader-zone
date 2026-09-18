import { Trade, Direction, AssetClass } from '../types/trade';
import { detectTradingSession, calculatePips, sortTradesDescending } from './calculations';

/**
 * Robust date parser supporting YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, DD/MM/YYYY, YYYY.MM.DD, DD.MM.YYYY
 * with optional timestamps. Always extracts and registers the correct trade year.
 */
export function parseUniversalDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const trimmed = dateStr.trim();

  // 1. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (e.g. 2026-09-18 14:30:00 or 2026.09.18)
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const minute = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const second = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second);
  }

  // 2. DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY or DD.MM.YYYY (e.g. 18-09-2026 14:30:00 or 09/18/2026)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    let day = p1;
    let month = p2 - 1;
    if (p1 <= 12 && p2 > 12) {
      // US format MM/DD/YYYY
      month = p1 - 1;
      day = p2;
    }
    return new Date(year, month, day, hour, minute, second);
  }

  // 3. Fallback standard Date parse
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
 * Detect if CSV text belongs to Delta Exchange India Order History
 */
export function isDeltaIndiaCsv(csvText: string): boolean {
  const firstLines = csvText.slice(0, 1000).toLowerCase();
  return (
    firstLines.includes('contract') &&
    firstLines.includes('filled/remaining') &&
    (firstLines.includes('realised p&l') || firstLines.includes('realized p&l') || firstLines.includes('trading fees'))
  );
}

interface RawDeltaOrder {
  dateObj: Date;
  ts: number;
  isoTime: string;
  displayDate: string;
  contract: string;
  rawQty: number;
  lotSize: number; // divided by 1000
  side: 'buy' | 'sell';
  execPrice: number;
  stopPrice?: number;
  orderPrice?: number;
  fee: number;
  pnl: number;
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
 * - Captures both executed orders and conditional bracket trigger orders (SL / TP).
 * - Pairs opening & closing executions while matching bracket cancellations to extract TP and SL.
 * - Computes Planned R:R and Realized R:R.
 * - Divides lot size by 1000 as requested.
 * - Stores dates in DD-MM-YYYY format and ISO timestamps.
 * - Accurately determines round-trip trade direction (closing buy = SELL short; closing sell = BUY long).
 */
export function parseDeltaIndiaCsv(csvText: string, accountId: string): Trade[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const validRows: RawDeltaOrder[] = [];
  const bracketOrders: RawBracketOrder[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV quoting
    const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length < 14) continue;

    const status = cols[13].toLowerCase();
    const explanation = (cols[14] || '').toLowerCase();
    const rawTime = cols[0];
    const parsedDate = parseUniversalDate(rawTime);
    const contract = (cols[1] || 'CRYPTO').toUpperCase();
    const rawQty = parseFloat(cols[2]) || 0;
    const lotSize = parseFloat((rawQty / 1000).toFixed(5));
    const side = cols[3].toLowerCase() === 'sell' ? 'sell' : 'buy';
    const execPrice = parseFloat(cols[5]);
    const orderPrice = parseFloat(cols[6]) || undefined;
    const stopPrice = parseFloat(cols[7]) || undefined;
    const triggerPrice = stopPrice || orderPrice;

    // Check if this row is a conditional bracket trigger order (cancelled when position closes, e.g. SL or TP)
    if (
      triggerPrice &&
      (status === 'cancelled' || explanation.includes('position_closed') || explanation.includes('cancelled_by_user'))
    ) {
      bracketOrders.push({
        dateObj: parsedDate,
        ts: parsedDate.getTime(),
        contract,
        qty: rawQty,
        side,
        stopPrice: triggerPrice,
        orderPrice,
        explanation
      });
    }

    // Executed orders
    const filled = cols[4] || '';
    if (status === 'closed' && !isNaN(execPrice) && execPrice > 0 && !filled.startsWith('0.00')) {
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
        stopPrice,
        orderPrice,
        fee: parseFloat(cols[9]) || 0,
        pnl: parseFloat(cols[11]) || 0,
        orderId: cols[16] || cols[15] || `DELTA-${i}`,
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
    } else if (sym.includes('NIFTY') || sym.includes('BANKNIFTY') || sym.includes('SPX') || sym.includes('US30')) {
      assetClass = 'Indices';
    }

    if (order.pnl !== 0) {
      // CLOSING ORDER
      const isClosingSell = order.side === 'sell';
      const direction: Direction = isClosingSell ? 'BUY' : 'SELL';
      const queue = isClosingSell ? openLongs[sym] : openShorts[sym];

      let matchIdx = queue.findIndex(o => Math.abs(o.rawQty - order.rawQty) < 0.001);
      if (matchIdx === -1) matchIdx = 0;
      const openOrder = queue.length > 0 ? queue.splice(matchIdx, 1)[0] : undefined;

      const entryPrice = openOrder ? openOrder.execPrice : order.execPrice;
      const exitPrice = order.execPrice;
      const openTime = openOrder ? openOrder.isoTime : order.isoTime;
      const closeTime = order.isoTime;
      const commission = (openOrder ? openOrder.fee : 0) + order.fee;

      // Find any bracket trigger orders around close time (within 10 seconds of position closing)
      const matchingBrackets = bracketOrders.filter(b => 
        b.contract === sym && Math.abs(b.ts - order.ts) <= 10000
      );

      // Aggregate all potential trigger prices from closing order, open order, and bracket cancellations
      const candidatePrices: number[] = [];
      if (order.stopPrice && !isNaN(order.stopPrice)) candidatePrices.push(order.stopPrice);
      if (openOrder?.stopPrice && !isNaN(openOrder.stopPrice)) candidatePrices.push(openOrder.stopPrice);
      matchingBrackets.forEach(b => {
        if (b.stopPrice && !isNaN(b.stopPrice)) candidatePrices.push(b.stopPrice);
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
        grossPnl: order.pnl + commission,
        commission: parseFloat(commission.toFixed(4)),
        swap: 0,
        netPnl: parseFloat(order.pnl.toFixed(4)),
        pips: calculatePips(sym, direction, entryPrice, exitPrice),
        durationMinutes,
        session: detectTradingSession(openTime),
        setupTags: ['Delta Exchange India'],
        mistakeTags: [],
        notes: `Delta India | Date: ${order.displayDate} | Lots: ${order.lotSize} | Entry: ${entryPrice} | Exit: ${exitPrice}${stopLoss ? ` | SL: ${stopLoss}` : ''}${takeProfit ? ` | TP: ${takeProfit}` : ''}`,
        executionRating: order.pnl > 0 ? 5 : 3
      });
    } else {
      // OPENING ORDER (pnl === 0)
      if (order.side === 'buy') {
        openLongs[sym].push(order);
      } else {
        openShorts[sym].push(order);
      }
    }
  }

  return sortTradesDescending(trades);
}
