import { Trade, Direction, AssetClass, PropStage } from '../types/trade';
import { detectTradingSession, sortTradesDescending } from './calculations';

export function isFundedRoomCsv(csvText: string): boolean {
  if (!csvText) return false;
  const firstLine = csvText.trim().split(/\r?\n/)[0]?.toLowerCase() || '';
  return (
    firstLine.includes('order id') &&
    firstLine.includes('pair') &&
    firstLine.includes('margin mode') &&
    firstLine.includes('net p&l')
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(c => c.replace(/^["']|["']$/g, '').trim());
}

interface RawOrderRow {
  date: string;
  orderId: string;
  pair: string;
  type: string; // 'market', 'stop_loss', 'take_profit'
  side: string; // 'buy', 'sell'
  lotSize: number;
  price: number;
  marginMode: string;
  status: string; // 'filled', 'cancelled'
  netPnlStr: string;
  timestamp: number;
}

function detectAssetClass(pair: string): AssetClass {
  const p = pair.toUpperCase();
  if (p.includes('XAU') || p.includes('GOLD') || p.includes('XAG') || p.includes('OIL') || p.includes('BRENT')) {
    return 'Commodities';
  }
  if (p.includes('BTC') || p.includes('ETH') || p.includes('SOL') || p.includes('USDT') || p.includes('CRYPTO')) {
    return 'Crypto';
  }
  if (p.includes('US30') || p.includes('NAS') || p.includes('SPX') || p.includes('GER') || p.includes('INDEX')) {
    return 'Indices';
  }
  return 'Forex';
}

/**
 * Parse Funded Room CSV export by pairing entry and exit execution orders
 */
export function parseFundedRoomCsv(
  csvText: string,
  accountId: string,
  stage: PropStage = 'stage1'
): Trade[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rawRows: RawOrderRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    if (cols.length < 8) continue;

    const date = cols[0];
    const orderId = cols[1];
    const pair = cols[2];
    const type = cols[3]?.toLowerCase();
    const side = cols[4]?.toLowerCase();
    const lotSize = parseFloat(cols[5]) || 0;
    const price = parseFloat(cols[6]) || 0;
    const marginMode = cols[7];
    const status = cols[8]?.toLowerCase();
    const netPnlStr = cols[9] !== undefined ? cols[9].trim() : '';

    if (!orderId || !pair) continue;

    const timestamp = new Date(date).getTime();
    if (isNaN(timestamp)) continue;

    rawRows.push({
      date,
      orderId,
      pair,
      type,
      side,
      lotSize,
      price,
      marginMode,
      status,
      netPnlStr,
      timestamp
    });
  }

  // Sort chronologically ascending (oldest first) for accurate chronological pairing
  rawRows.sort((a, b) => a.timestamp - b.timestamp);

  // Group orders by Pair
  const pairGroups = new Map<string, RawOrderRow[]>();
  rawRows.forEach(row => {
    const p = row.pair;
    const existing = pairGroups.get(p) || [];
    existing.push(row);
    pairGroups.set(p, existing);
  });

  const trades: Trade[] = [];

  pairGroups.forEach((orders, pair) => {
    // Collect unfilled entries
    const openPool: RawOrderRow[] = [];

    // Map of cancelled orders by close timestamp to extract planned SL / TP
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      if (order.status !== 'filled') {
        continue;
      }

      const hasPnl = order.netPnlStr !== '' && !isNaN(parseFloat(order.netPnlStr));

      if (!hasPnl) {
        // This is an OPENING (Entry) order
        openPool.push(order);
      } else {
        // This is a CLOSING (Exit) order
        const netPnl = parseFloat(order.netPnlStr);
        const exitSide = order.side; // e.g. 'sell' means entry was 'buy'
        const expectedEntrySide = exitSide === 'sell' ? 'buy' : 'sell';

        // Find the matching open order (closest preceding order with opposite side)
        let openMatchIndex = -1;
        for (let j = openPool.length - 1; j >= 0; j--) {
          const candidate = openPool[j];
          if (candidate.side === expectedEntrySide && Math.abs(candidate.lotSize - order.lotSize) < 0.0001) {
            openMatchIndex = j;
            break;
          }
        }

        // If exact lot size not found, take the most recent opposite side
        if (openMatchIndex === -1) {
          for (let j = openPool.length - 1; j >= 0; j--) {
            const candidate = openPool[j];
            if (candidate.side === expectedEntrySide) {
              openMatchIndex = j;
              break;
            }
          }
        }

        let entryOrder: RawOrderRow | null = null;
        if (openMatchIndex !== -1) {
          entryOrder = openPool.splice(openMatchIndex, 1)[0];
        }

        const openTime = entryOrder ? entryOrder.date : order.date;
        const closeTime = order.date;
        const entryPrice = entryOrder ? entryOrder.price : order.price;
        const exitPrice = order.price;
        const direction: Direction = expectedEntrySide === 'buy' ? 'BUY' : 'SELL';

        // Find planned SL/TP from cancelled orders around closing time
        const nearbyCancelled = cancelledOrders.filter(
          c => Math.abs(c.timestamp - order.timestamp) < 5000
        );
        const slOrder = nearbyCancelled.find(c => c.type === 'stop_loss');
        const tpOrder = nearbyCancelled.find(c => c.type === 'take_profit');

        const plannedSl = slOrder ? slOrder.price : order.type === 'stop_loss' ? order.price : undefined;
        const plannedTp = tpOrder ? tpOrder.price : order.type === 'take_profit' ? order.price : undefined;

        let closedBy: 'SL' | 'TP' | 'User' = 'User';
        if (order.type === 'stop_loss') closedBy = 'SL';
        else if (order.type === 'take_profit') closedBy = 'TP';

        const durationMinutes = Math.max(
          1,
          Math.round((order.timestamp - (entryOrder ? entryOrder.timestamp : order.timestamp)) / 60000)
        );

        const assetClass = detectAssetClass(pair);
        const cleanSymbol = pair.replace('/', '').toUpperCase();

        const trade: Trade = {
          id: `trade-fr-${order.orderId}`,
          ticket: order.orderId,
          accountId,
          propStage: stage,
          symbol: cleanSymbol,
          assetClass,
          direction,
          status: 'CLOSED',
          lotSize: order.lotSize,
          entryPrice,
          exitPrice,
          stopLoss: plannedSl,
          takeProfit: plannedTp,
          closedBy,
          openTime,
          closeTime,
          durationMinutes,
          commission: 0,
          swap: 0,
          netPnl,
          grossPnl: netPnl,
          session: detectTradingSession(openTime),
          setupTags: ['Funded Room'],
          mistakeTags: []
        };

        trades.push(trade);
      }
    }

    // Remaining orders in openPool are open positions
    openPool.forEach(openOrder => {
      const assetClass = detectAssetClass(pair);
      const cleanSymbol = pair.replace('/', '').toUpperCase();
      const direction: Direction = openOrder.side === 'buy' ? 'BUY' : 'SELL';

      trades.push({
        id: `trade-fr-${openOrder.orderId}`,
        ticket: openOrder.orderId,
        accountId,
        propStage: stage,
        symbol: cleanSymbol,
        assetClass,
        direction,
        status: 'OPEN',
        lotSize: openOrder.lotSize,
        entryPrice: openOrder.price,
        openTime: openOrder.date,
        commission: 0,
        swap: 0,
        netPnl: 0,
        session: detectTradingSession(openOrder.date),
        setupTags: ['Funded Room'],
        mistakeTags: []
      });
    });
  });

  return sortTradesDescending(trades);
}
