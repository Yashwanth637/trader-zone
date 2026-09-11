import { Trade, Direction, TradingSession } from '../types/trade';

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbolMap: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$'
  };
  const sym = symbolMap[currency] || '$';
  const isNeg = amount < 0;
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${isNeg ? '-' : ''}${sym}${abs}`;
}

export function detectTradingSession(isoTime: string): TradingSession {
  const date = new Date(isoTime);
  const hour = date.getUTCHours();

  // Tokyo/Asian: 00:00 - 08:00 UTC
  // London: 08:00 - 16:00 UTC
  // New York: 13:00 - 21:00 UTC
  // Overlap (London + NY): 13:00 - 16:00 UTC
  if (hour >= 13 && hour < 16) return 'Overlap';
  if (hour >= 8 && hour < 16) return 'London';
  if (hour >= 13 && hour < 21) return 'New York';
  if (hour >= 0 && hour < 8) return 'Asian';
  return 'Off-Hours';
}

export function calculatePips(symbol: string, direction: Direction, entry: number, exit: number): number {
  if (!entry || !exit) return 0;
  const sym = symbol.toUpperCase();
  const diff = direction === 'BUY' ? exit - entry : entry - exit;

  if (sym.includes('JPY')) {
    return parseFloat((diff * 100).toFixed(1));
  } else if (sym.includes('XAU') || sym.includes('GOLD')) {
    return parseFloat((diff * 10).toFixed(1));
  } else if (sym.includes('BTC') || sym.includes('US30') || sym.includes('NAS') || sym.includes('SPX')) {
    return parseFloat(diff.toFixed(1));
  } else {
    // Standard Forex 4/5 digit
    return parseFloat((diff * 10000).toFixed(1));
  }
}

export function calculatePnlFromPrices(
  symbol: string,
  direction: Direction,
  lotSize: number,
  entry: number,
  exit: number,
  commission: number = 0,
  swap: number = 0
): { grossPnl: number; netPnl: number; pips: number } {
  const pips = calculatePips(symbol, direction, entry, exit);
  const sym = symbol.toUpperCase();

  let pipValuePerLot = 10; // Standard 100k contract Forex
  if (sym.includes('XAU') || sym.includes('GOLD')) {
    pipValuePerLot = 10; // 100 oz contract: 0.1 move = $10
  } else if (sym.includes('BTC') || sym.includes('ETH')) {
    pipValuePerLot = 1;
  }

  const grossPnl = parseFloat((pips * pipValuePerLot * lotSize).toFixed(2));
  const netPnl = parseFloat((grossPnl - commission - swap).toFixed(2));

  return { grossPnl, netPnl, pips };
}

export interface SummaryStats {
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdownUsd: number;
  maxDrawdownPercent: number;
  expectancy: number;
  totalLots: number;
  totalCommission: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
}

export function calculateSummaryStats(trades: Trade[], startingBalance: number = 10000): SummaryStats {
  const closed = trades.filter(t => t.status === 'CLOSED');
  if (closed.length === 0) {
    return {
      netPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      winLossRatio: 0,
      largestWin: 0,
      largestLoss: 0,
      maxDrawdownUsd: 0,
      maxDrawdownPercent: 0,
      expectancy: 0,
      totalLots: 0,
      totalCommission: 0,
      currentStreak: { type: 'none', count: 0 }
    };
  }

  let grossProfit = 0;
  let grossLoss = 0;
  let netPnl = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakEvenTrades = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let totalLots = 0;
  let totalCommission = 0;

  closed.forEach(t => {
    const pnl = t.netPnl;
    netPnl += pnl;
    totalLots += t.lotSize || 0;
    totalCommission += (t.commission || 0) + (t.swap || 0);

    if (pnl > 0.01) {
      winningTrades++;
      grossProfit += pnl;
      if (pnl > largestWin) largestWin = pnl;
    } else if (pnl < -0.01) {
      losingTrades++;
      grossLoss += Math.abs(pnl);
      if (Math.abs(pnl) > largestLoss) largestLoss = Math.abs(pnl);
    } else {
      breakEvenTrades++;
    }
  });

  const totalTrades = closed.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? avgWin : 0;

  // Expectancy = (WinRate% * AvgWin) - (LossRate% * AvgLoss)
  const winProb = winRate / 100;
  const lossProb = losingTrades / totalTrades;
  const expectancy = (winProb * avgWin) - (lossProb * avgLoss);

  // Calculate Max Drawdown
  let peak = startingBalance;
  let currentBalance = startingBalance;
  let maxDrawdownUsd = 0;
  let maxDrawdownPercent = 0;

  // Sort trades chronologically
  const sorted = [...closed].sort((a, b) => new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime());
  sorted.forEach(t => {
    currentBalance += t.netPnl;
    if (currentBalance > peak) {
      peak = currentBalance;
    }
    const ddUsd = peak - currentBalance;
    const ddPct = peak > 0 ? (ddUsd / peak) * 100 : 0;
    if (ddUsd > maxDrawdownUsd) maxDrawdownUsd = ddUsd;
    if (ddPct > maxDrawdownPercent) maxDrawdownPercent = ddPct;
  });

  // Calculate current streak (from latest closed trades)
  const latestTrades = [...sorted].reverse();
  let streakType: 'win' | 'loss' | 'none' = 'none';
  let streakCount = 0;

  for (const t of latestTrades) {
    if (t.netPnl > 0.01) {
      if (streakType === 'none' || streakType === 'win') {
        streakType = 'win';
        streakCount++;
      } else break;
    } else if (t.netPnl < -0.01) {
      if (streakType === 'none' || streakType === 'loss') {
        streakType = 'loss';
        streakCount++;
      } else break;
    } else {
      break;
    }
  }

  return {
    netPnl: parseFloat(netPnl.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    grossLoss: parseFloat(grossLoss.toFixed(2)),
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate: parseFloat(winRate.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    winLossRatio: parseFloat(winLossRatio.toFixed(2)),
    largestWin: parseFloat(largestWin.toFixed(2)),
    largestLoss: parseFloat(largestLoss.toFixed(2)),
    maxDrawdownUsd: parseFloat(maxDrawdownUsd.toFixed(2)),
    maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    totalLots: parseFloat(totalLots.toFixed(2)),
    totalCommission: parseFloat(totalCommission.toFixed(2)),
    currentStreak: { type: streakType, count: streakCount }
  };
}

export function filterTradesByPeriod(trades: Trade[], period: string, customRange?: { from: string; to: string }): Trade[] {
  const now = new Date();
  
  if (period === 'all') return trades;

  return trades.filter(t => {
    const tradeDate = new Date(t.closeTime || t.openTime);
    if (period === 'today') {
      return tradeDate.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return tradeDate >= oneWeekAgo;
    }
    if (period === 'month') {
      return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
    }
    if (period === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const tradeQuarter = Math.floor(tradeDate.getMonth() / 3);
      return currentQuarter === tradeQuarter && tradeDate.getFullYear() === now.getFullYear();
    }
    if (period === 'year') {
      return tradeDate.getFullYear() === now.getFullYear();
    }
    if (period === 'custom' && customRange?.from && customRange?.to) {
      const from = new Date(customRange.from);
      const to = new Date(customRange.to);
      to.setHours(23, 59, 59, 999);
      return tradeDate >= from && tradeDate <= to;
    }
    return true;
  });
}
