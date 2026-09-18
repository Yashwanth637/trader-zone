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
  isoTime: string;
  displayDate: string;
  contract: string;
  rawQty: number;
  lotSize: number; // divided by 1000
  side: 'buy' | 'sell';
  execPrice: number;
  stopPrice?: number;
  fee: number;
  pnl: number;
  orderId: string;
}

/**
 * Specialized parser for Delta Exchange India Order History CSV.
 * - Filters out cancelled, zero-filled, and liquidation trigger rows.
 * - Divides lot size by 1000 as requested.
 * - Stores dates in DD-MM-YYYY format.
 * - Accurately determines round-trip trade direction (closing buy = SELL short; closing sell = BUY long).
 */
export function parseDeltaIndiaCsv(csvText: string, accountId: string): Trade[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const validRows: RawDeltaOrder[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV quoting
    const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length < 14) continue;

    const status = cols[13].toLowerCase();
    const filled = cols[4] || '';
    const execPrice = parseFloat(cols[5]);

    // Filter out cancelled, zero-filled, or unexecuted orders
    if (status !== 'closed' || isNaN(execPrice) || execPrice <= 0 || filled.startsWith('0.00')) {
      continue;
    }

    const rawTime = cols[0];
    const parsedDate = parseUniversalDate(rawTime);

    const rawQty = parseFloat(cols[2]) || 0;
    // Divide lot size by 1000
    const lotSize = parseFloat((rawQty / 1000).toFixed(5));

    validRows.push({
      dateObj: parsedDate,
      isoTime: parsedDate.toISOString(),
      displayDate: formatDDMMYYYY(parsedDate),
      contract: (cols[1] || 'CRYPTO').toUpperCase(),
      rawQty,
      lotSize,
      side: cols[3].toLowerCase() === 'sell' ? 'sell' : 'buy',
      execPrice,
      stopPrice: parseFloat(cols[7]) || undefined,
      fee: parseFloat(cols[9]) || 0,
      pnl: parseFloat(cols[11]) || 0,
      orderId: cols[16] || cols[15] || `DELTA-${i}`
    });
  }

  // Sort chronologically (oldest first)
  validRows.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

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
      if (order.side === 'buy') {
        // Closing order is BUY -> Original trade direction was SELL (Short)
        let matchIdx = openShorts[sym].findIndex(o => Math.abs(o.rawQty - order.rawQty) < 0.001);
        if (matchIdx === -1) matchIdx = 0;
        const openOrder = openShorts[sym].splice(matchIdx, 1)[0];

        const entryPrice = openOrder ? openOrder.execPrice : order.execPrice;
        const exitPrice = order.execPrice;
        const openTime = openOrder ? openOrder.isoTime : order.isoTime;
        const closeTime = order.isoTime;
        const commission = (openOrder ? openOrder.fee : 0) + order.fee;
        const stopLoss = order.stopPrice || (openOrder ? openOrder.stopPrice : undefined);

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
          direction: 'SELL',
          status: 'CLOSED',
          lotSize: order.lotSize,
          entryPrice,
          exitPrice,
          stopLoss,
          openTime,
          closeTime,
          grossPnl: order.pnl + commission,
          commission: parseFloat(commission.toFixed(4)),
          swap: 0,
          netPnl: parseFloat(order.pnl.toFixed(4)),
          pips: calculatePips(sym, 'SELL', entryPrice, exitPrice),
          durationMinutes,
          session: detectTradingSession(openTime),
          setupTags: ['Delta Exchange India'],
          mistakeTags: [],
          notes: `Delta India | Date: ${order.displayDate} | Lots: ${order.lotSize} | Entry: ${entryPrice} | Exit: ${exitPrice}`,
          executionRating: order.pnl > 0 ? 5 : 3
        });
      } else {
        // Closing order is SELL -> Original trade direction was BUY (Long)
        let matchIdx = openLongs[sym].findIndex(o => Math.abs(o.rawQty - order.rawQty) < 0.001);
        if (matchIdx === -1) matchIdx = 0;
        const openOrder = openLongs[sym].splice(matchIdx, 1)[0];

        const entryPrice = openOrder ? openOrder.execPrice : order.execPrice;
        const exitPrice = order.execPrice;
        const openTime = openOrder ? openOrder.isoTime : order.isoTime;
        const closeTime = order.isoTime;
        const commission = (openOrder ? openOrder.fee : 0) + order.fee;
        const stopLoss = order.stopPrice || (openOrder ? openOrder.stopPrice : undefined);

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
          direction: 'BUY',
          status: 'CLOSED',
          lotSize: order.lotSize,
          entryPrice,
          exitPrice,
          stopLoss,
          openTime,
          closeTime,
          grossPnl: order.pnl + commission,
          commission: parseFloat(commission.toFixed(4)),
          swap: 0,
          netPnl: parseFloat(order.pnl.toFixed(4)),
          pips: calculatePips(sym, 'BUY', entryPrice, exitPrice),
          durationMinutes,
          session: detectTradingSession(openTime),
          setupTags: ['Delta Exchange India'],
          mistakeTags: [],
          notes: `Delta India | Date: ${order.displayDate} | Lots: ${order.lotSize} | Entry: ${entryPrice} | Exit: ${exitPrice}`,
          executionRating: order.pnl > 0 ? 5 : 3
        });
      }
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
