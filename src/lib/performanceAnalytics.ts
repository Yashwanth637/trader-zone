import { Trade } from '../types/trade';

export interface ProfitDistributionTier {
  name: string;
  count: number;
  pct: number;
  color: string;
  pnl: number;
}

export interface ProfitDistributionData {
  netPnl: number;
  biggestWin: number;
  biggestLoss: number;
  avgWin: number;
  avgLoss: number;
  tiers: ProfitDistributionTier[];
}

export interface HourlyStat {
  hourStr: string; // e.g. "19:00"
  hourNum: number; // 0 to 23
  netPnl: number;
  tradeCount: number;
  winningTrades: number;
  avgPnl: number;
}

export interface HourlyPerformanceData {
  hourlyStats: HourlyStat[];
  bestHour: {
    hourStr: string;
    avgPnl: number;
    tradeCount: number;
    totalPnl: number;
  } | null;
  worstHour: {
    hourStr: string;
    avgPnl: number;
    tradeCount: number;
    totalPnl: number;
  } | null;
  mostActiveHour: {
    hourStr: string;
    tradeCount: number;
    totalPnl: number;
  } | null;
  advice: {
    title: string;
    description: string;
    isWarning: boolean;
  };
}

export interface SymbolDetailStat {
  symbol: string;
  initials: string;
  netPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  sharePct: number;
}

export interface SymbolPerformanceData {
  symbolsTradedCount: number;
  bestSymbol: {
    symbol: string;
    netPnl: number;
  } | null;
  mostTradedSymbol: {
    symbol: string;
    tradeCount: number;
  } | null;
  worstSymbol: {
    symbol: string;
    netPnl: number;
  } | null;
  symbols: SymbolDetailStat[];
}

/**
 * Calculates Profit Distribution analytics for Image 1 Left Card
 */
export function calculateProfitDistribution(trades: Trade[]): ProfitDistributionData {
  const closed = trades.filter(t => t.status === 'CLOSED');

  if (closed.length === 0) {
    return {
      netPnl: 0,
      biggestWin: 0,
      biggestLoss: 0,
      avgWin: 0,
      avgLoss: 0,
      tiers: [
        { name: 'Big Wins', count: 0, pct: 25, color: '#10b981', pnl: 0 },
        { name: 'Moderate Wins', count: 0, pct: 25, color: '#34d399', pnl: 0 },
        { name: 'Small Losses', count: 0, pct: 25, color: '#f97316', pnl: 0 },
        { name: 'Big Losses', count: 0, pct: 25, color: '#ef4444', pnl: 0 }
      ]
    };
  }

  let totalPnl = 0;
  let biggestWin = 0;
  let biggestLoss = 0;
  let winSum = 0;
  let winCount = 0;
  let lossSum = 0;
  let lossCount = 0;

  closed.forEach(t => {
    totalPnl += t.netPnl;
    if (t.netPnl > 0.01) {
      winSum += t.netPnl;
      winCount++;
      if (t.netPnl > biggestWin) biggestWin = t.netPnl;
    } else if (t.netPnl < -0.01) {
      lossSum += Math.abs(t.netPnl);
      lossCount++;
      if (Math.abs(t.netPnl) > Math.abs(biggestLoss)) biggestLoss = t.netPnl;
    }
  });

  const avgWin = winCount > 0 ? winSum / winCount : 0;
  const avgLoss = lossCount > 0 ? lossSum / lossCount : 0;

  // Categorize trades into 4 tiers
  let bigWinsCount = 0;
  let bigWinsPnl = 0;
  let modWinsCount = 0;
  let modWinsPnl = 0;
  let smallLossCount = 0;
  let smallLossPnl = 0;
  let bigLossCount = 0;
  let bigLossPnl = 0;

  const bigWinThreshold = avgWin > 0 ? avgWin * 1.3 : 1000;
  const bigLossThreshold = avgLoss > 0 ? avgLoss * 1.3 : 500;

  closed.forEach(t => {
    const pnl = t.netPnl;
    if (pnl >= bigWinThreshold) {
      bigWinsCount++;
      bigWinsPnl += pnl;
    } else if (pnl > 0.01) {
      modWinsCount++;
      modWinsPnl += pnl;
    } else if (pnl >= -bigLossThreshold) {
      smallLossCount++;
      smallLossPnl += pnl;
    } else {
      bigLossCount++;
      bigLossPnl += pnl;
    }
  });

  const totalClosed = closed.length;
  const tiers: ProfitDistributionTier[] = [
    {
      name: 'Big Wins',
      count: bigWinsCount,
      pct: totalClosed > 0 ? Math.round((bigWinsCount / totalClosed) * 100) : 25,
      color: '#10b981', // Emerald
      pnl: parseFloat(bigWinsPnl.toFixed(2))
    },
    {
      name: 'Moderate Wins',
      count: modWinsCount,
      pct: totalClosed > 0 ? Math.round((modWinsCount / totalClosed) * 100) : 25,
      color: '#34d399', // Mint
      pnl: parseFloat(modWinsPnl.toFixed(2))
    },
    {
      name: 'Small Losses',
      count: smallLossCount,
      pct: totalClosed > 0 ? Math.round((smallLossCount / totalClosed) * 100) : 25,
      color: '#f97316', // Orange
      pnl: parseFloat(smallLossPnl.toFixed(2))
    },
    {
      name: 'Big Losses',
      count: bigLossCount,
      pct: totalClosed > 0 ? Math.round((bigLossCount / totalClosed) * 100) : 25,
      color: '#ef4444', // Rose Red
      pnl: parseFloat(bigLossPnl.toFixed(2))
    }
  ];

  return {
    netPnl: parseFloat(totalPnl.toFixed(2)),
    biggestWin: parseFloat(biggestWin.toFixed(2)),
    biggestLoss: parseFloat(biggestLoss.toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    tiers
  };
}

/**
 * Calculates Hourly Performance analytics for Image 1 Right Card
 */
export function calculateHourlyPerformance(trades: Trade[]): HourlyPerformanceData {
  const closed = trades.filter(t => t.status === 'CLOSED');

  // 24 hour buckets
  const hourMap: Record<number, { pnl: number; count: number; wins: number }> = {};
  for (let i = 0; i < 24; i++) {
    hourMap[i] = { pnl: 0, count: 0, wins: 0 };
  }

  closed.forEach(t => {
    const d = new Date(t.openTime || t.closeTime);
    const hour = d.getHours();
    hourMap[hour].pnl += t.netPnl;
    hourMap[hour].count += 1;
    if (t.netPnl > 0.01) {
      hourMap[hour].wins += 1;
    }
  });

  // Filter to active hours that have trades (or prominent hours if no trades)
  const activeHourEntries = Object.entries(hourMap)
    .map(([h, data]) => {
      const hourNum = parseInt(h, 10);
      const hourStr = `${hourNum.toString().padStart(2, '0')}:00`;
      const avgPnl = data.count > 0 ? data.pnl / data.count : 0;
      return {
        hourNum,
        hourStr,
        netPnl: parseFloat(data.pnl.toFixed(2)),
        tradeCount: data.count,
        winningTrades: data.wins,
        avgPnl: parseFloat(avgPnl.toFixed(2))
      };
    });

  // Filter to hours with trades, or default sample if empty
  const hoursWithTrades = activeHourEntries.filter(h => h.tradeCount > 0);
  const hourlyStats = hoursWithTrades.length > 0
    ? hoursWithTrades.sort((a, b) => a.hourNum - b.hourNum)
    : [0, 1, 7, 12, 19, 20, 21, 22, 23].map(h => ({
        hourNum: h,
        hourStr: `${h.toString().padStart(2, '0')}:00`,
        netPnl: 0,
        tradeCount: 0,
        winningTrades: 0,
        avgPnl: 0
      }));

  // Identify Best Hour, Worst Hour, Most Active
  let bestHour: HourlyPerformanceData['bestHour'] = null;
  let worstHour: HourlyPerformanceData['worstHour'] = null;
  let mostActiveHour: HourlyPerformanceData['mostActiveHour'] = null;

  hoursWithTrades.forEach(h => {
    // Best Hour (highest positive average P&L)
    if (h.avgPnl > 0) {
      if (!bestHour || h.avgPnl > bestHour.avgPnl) {
        bestHour = {
          hourStr: h.hourStr,
          avgPnl: h.avgPnl,
          tradeCount: h.tradeCount,
          totalPnl: h.netPnl
        };
      }
    }

    // Worst Hour (lowest negative average P&L)
    if (h.avgPnl < 0) {
      if (!worstHour || h.avgPnl < worstHour.avgPnl) {
        worstHour = {
          hourStr: h.hourStr,
          avgPnl: h.avgPnl,
          tradeCount: h.tradeCount,
          totalPnl: h.netPnl
        };
      }
    }

    // Most Active (highest trade count)
    if (!mostActiveHour || h.tradeCount > mostActiveHour.tradeCount) {
      mostActiveHour = {
        hourStr: h.hourStr,
        tradeCount: h.tradeCount,
        totalPnl: h.netPnl
      };
    }
  });

  // Generate actionable advice
  let advice = {
    title: 'Optimal Execution Throughout the Day',
    description: 'No significant negative trading hours detected across your trade history.',
    isWarning: false
  };

  if (worstHour && worstHour.avgPnl < -50) {
    advice = {
      title: `Consider avoiding trades at ${worstHour.hourStr}`,
      description: `You have an average loss of -$${Math.abs(Math.round(worstHour.avgPnl)).toLocaleString()} per trade during this hour`,
      isWarning: true
    };
  } else if (bestHour && bestHour.avgPnl > 100) {
    advice = {
      title: `Prime Performance Window: ${bestHour.hourStr}`,
      description: `Your highest edge is concentrated here with +$${Math.round(bestHour.avgPnl).toLocaleString()} avg return per trade`,
      isWarning: false
    };
  }

  return {
    hourlyStats,
    bestHour,
    worstHour,
    mostActiveHour,
    advice
  };
}

/**
 * Calculates Symbol Performance analytics for Image 2 Full Width Card
 */
export function calculateSymbolPerformance(trades: Trade[]): SymbolPerformanceData {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const symbolMap: Record<string, { pnl: number; total: number; wins: number; losses: number }> = {};

  closed.forEach(t => {
    const sym = t.symbol.toUpperCase();
    if (!symbolMap[sym]) {
      symbolMap[sym] = { pnl: 0, total: 0, wins: 0, losses: 0 };
    }
    symbolMap[sym].pnl += t.netPnl;
    symbolMap[sym].total += 1;
    if (t.netPnl > 0.01) {
      symbolMap[sym].wins += 1;
    } else if (t.netPnl < -0.01) {
      symbolMap[sym].losses += 1;
    }
  });

  const totalTradesCount = closed.length;

  const symbols: SymbolDetailStat[] = Object.entries(symbolMap).map(([symbol, data]) => {
    const initials = symbol.slice(0, 2).toUpperCase();
    const winRate = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
    const sharePct = totalTradesCount > 0 ? Math.round((data.total / totalTradesCount) * 100) : 0;

    return {
      symbol,
      initials,
      netPnl: parseFloat(data.pnl.toFixed(2)),
      totalTrades: data.total,
      winningTrades: data.wins,
      losingTrades: data.losses,
      winRate,
      sharePct
    };
  });

  // Sort symbols by net P&L descending
  symbols.sort((a, b) => b.netPnl - a.netPnl);

  // Best symbol
  const profitableSymbols = symbols.filter(s => s.netPnl > 0);
  const bestSymbol = profitableSymbols.length > 0
    ? { symbol: profitableSymbols[0].symbol, netPnl: profitableSymbols[0].netPnl }
    : symbols.length > 0 ? { symbol: symbols[0].symbol, netPnl: symbols[0].netPnl } : null;

  // Most traded symbol
  const mostTraded = [...symbols].sort((a, b) => b.totalTrades - a.totalTrades);
  const mostTradedSymbol = mostTraded.length > 0
    ? { symbol: mostTraded[0].symbol, tradeCount: mostTraded[0].totalTrades }
    : null;

  // Worst symbol (lowest P&L)
  const lossSymbols = [...symbols].sort((a, b) => a.netPnl - b.netPnl);
  const worstSymbol = lossSymbols.length > 0 && lossSymbols[0].netPnl < 0
    ? { symbol: lossSymbols[0].symbol, netPnl: lossSymbols[0].netPnl }
    : null;

  return {
    symbolsTradedCount: symbols.length,
    bestSymbol,
    mostTradedSymbol,
    worstSymbol,
    symbols
  };
}
