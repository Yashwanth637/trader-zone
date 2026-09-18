import { Trade, Direction, AssetClass } from '../types/trade';
import { detectTradingSession, calculatePips, sortTradesDescending } from './calculations';
import { isDeltaIndiaCsv, parseDeltaIndiaCsv, parseUniversalDate } from './deltaIndiaParser';

export function parseBrokerCsv(csvText: string, accountId: string): Trade[] {
  // Check if this is a Delta Exchange India CSV export
  if (isDeltaIndiaCsv(csvText)) {
    return parseDeltaIndiaCsv(csvText, accountId);
  }

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const trades: Trade[] = [];

  // Determine format
  // MT4/MT5 CSV typical header: Ticket, Open Time, Type, Size, Item, Price, S / L, T / P, Close Time, Price, Commission, Taxes, Swap, Profit
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle comma or semicolon or tab separated
    const delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
    const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());

    if (cols.length < 5) continue;

    try {
      let ticket = `CSV-${Date.now()}-${i}`;
      let symbol = 'EURUSD';
      let direction: Direction = 'BUY';
      let lotSize = 1.0;
      let entryPrice = 1.0;
      let exitPrice: number | undefined = undefined;
      let stopLoss: number | undefined = undefined;
      let takeProfit: number | undefined = undefined;
      let openTime = new Date().toISOString();
      let closeTime: string | undefined = undefined;
      let netPnl = 0;
      let commission = 0;
      let swap = 0;

      if (header.includes('ticket') || header.includes('order')) {
        // Typical MT4/MT5 statement
        ticket = cols[0] || ticket;
        openTime = cols[1] ? parseUniversalDate(cols[1]).toISOString() : openTime;
        direction = cols[2]?.toLowerCase().includes('sell') ? 'SELL' : 'BUY';
        const rawSize = parseFloat(cols[3]) || 1.0;
        // If raw size in CSV is contracts (e.g. 50 in CSV), convert to actual lot size (0.05)
        lotSize = rawSize >= 10 ? parseFloat((rawSize / 1000).toFixed(5)) : rawSize;
        symbol = (cols[4] || 'EURUSD').toUpperCase();
        entryPrice = parseFloat(cols[5]) || 0;
        stopLoss = parseFloat(cols[6]) || undefined;
        takeProfit = parseFloat(cols[7]) || undefined;
        closeTime = cols[8] ? parseUniversalDate(cols[8]).toISOString() : undefined;
        exitPrice = cols[9] ? parseFloat(cols[9]) : undefined;
        commission = cols[10] ? parseFloat(cols[10]) : 0;
        swap = cols[12] ? parseFloat(cols[12]) : 0;
        netPnl = cols[13] ? parseFloat(cols[13]) : 0;
      } else {
        // Generic CSV: Date, Symbol, Type, Lots, Entry, Exit, PnL
        openTime = cols[0] ? parseUniversalDate(cols[0]).toISOString() : openTime;
        symbol = (cols[1] || 'EURUSD').toUpperCase();
        direction = cols[2]?.toLowerCase().includes('sell') || cols[2]?.toLowerCase().includes('short') ? 'SELL' : 'BUY';
        const rawSize = parseFloat(cols[3]) || 1.0;
        // If raw size in CSV is contracts (e.g. 50 in CSV), convert to actual lot size (0.05)
        lotSize = rawSize >= 10 ? parseFloat((rawSize / 1000).toFixed(5)) : rawSize;
        entryPrice = parseFloat(cols[4]) || 0;
        exitPrice = cols[5] ? parseFloat(cols[5]) : undefined;
        netPnl = cols[6] ? parseFloat(cols[6]) : 0;
        closeTime = exitPrice ? openTime : undefined;
      }

      let assetClass: AssetClass = 'Forex';
      if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL')) {
        assetClass = 'Crypto';
      } else if (symbol.includes('XAU') || symbol.includes('GOLD') || symbol.includes('OIL')) {
        assetClass = 'Commodities';
      } else if (symbol.includes('US30') || symbol.includes('NAS') || symbol.includes('SPX') || symbol.includes('GER30')) {
        assetClass = 'Indices';
      }

      const pips = exitPrice ? calculatePips(symbol, direction, entryPrice, exitPrice) : 0;

      trades.push({
        id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ticket,
        accountId,
        symbol,
        assetClass,
        direction,
        status: exitPrice ? 'CLOSED' : 'OPEN',
        lotSize,
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        openTime,
        closeTime,
        grossPnl: netPnl + commission + swap,
        commission: Math.abs(commission),
        swap: Math.abs(swap),
        netPnl,
        pips,
        session: detectTradingSession(openTime),
        setupTags: ['Broker Import'],
        mistakeTags: [],
        executionRating: netPnl > 0 ? 5 : 3
      });
    } catch (err) {
      console.warn('Skipping row due to parse error:', line, err);
    }
  }

  return sortTradesDescending(trades);
}
