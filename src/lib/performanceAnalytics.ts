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

export interface DrawdownPoint {
  index: number;
  date: string; // "Aug 26"
  fullDate: string; // "Aug 26, 2026"
  timestamp: number;
  balance: number;
  peak: number;
  drawdownUsd: number; // e.g. 37369.88 (positive magnitude)
  drawdownPct: number; // e.g. 37.37
  tradeSymbol?: string;
  tradePnl?: number;
}

export interface DrawdownAnalysisData {
  points: DrawdownPoint[];
  maxDrawdownUsd: number;
  maxDrawdownPct: number;
  maxDrawdownDate: string;
  currentDrawdownUsd: number;
  currentDrawdownPct: number;
  hasData: boolean;
}

export interface StreakItem {
  id: string;
  type: 'W' | 'L';
  count: number;
}

export interface StreakTrackingData {
  currentStreak: {
    type: 'win' | 'loss' | 'none';
    count: number;
  };
  longestWin: number;
  longestLoss: number;
  history: StreakItem[];
  totalWins: number;
  totalLosses: number;
  hasData: boolean;
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
    // Best Hour: Hour with the highest total net profit (matching the peak green bar on the chart)
    if (h.netPnl > 0) {
      if (!bestHour || h.netPnl > (bestHour.totalPnl || 0)) {
        bestHour = {
          hourStr: h.hourStr,
          avgPnl: h.avgPnl,
          tradeCount: h.tradeCount,
          totalPnl: h.netPnl
        };
      }
    }

    // Worst Hour: Hour with the deepest total net loss (matching the lowest red bar on the chart)
    if (h.netPnl < 0) {
      if (!worstHour || h.netPnl < (worstHour.totalPnl || 0)) {
        worstHour = {
          hourStr: h.hourStr,
          avgPnl: h.avgPnl,
          tradeCount: h.tradeCount,
          totalPnl: h.netPnl
        };
      }
    }

    // Most Active: Hour with the highest number of trades
    if (!mostActiveHour || h.tradeCount > mostActiveHour.tradeCount) {
      mostActiveHour = {
        hourStr: h.hourStr,
        tradeCount: h.tradeCount,
        totalPnl: h.netPnl
      };
    }
  });

  // Fallbacks if no positive or negative total PnL
  if (!bestHour) {
    const positiveAvg = hoursWithTrades.filter(h => h.avgPnl > 0).sort((a, b) => b.avgPnl - a.avgPnl);
    if (positiveAvg.length > 0) {
      bestHour = {
        hourStr: positiveAvg[0].hourStr,
        avgPnl: positiveAvg[0].avgPnl,
        tradeCount: positiveAvg[0].tradeCount,
        totalPnl: positiveAvg[0].netPnl
      };
    }
  }

  if (!worstHour) {
    const negativeAvg = hoursWithTrades.filter(h => h.avgPnl < 0).sort((a, b) => a.avgPnl - b.avgPnl);
    if (negativeAvg.length > 0) {
      worstHour = {
        hourStr: negativeAvg[0].hourStr,
        avgPnl: negativeAvg[0].avgPnl,
        tradeCount: negativeAvg[0].tradeCount,
        totalPnl: negativeAvg[0].netPnl
      };
    }
  }

  // Generate actionable advice
  let advice = {
    title: 'Optimal Execution Throughout the Day',
    description: 'No significant negative trading hours detected across your trade history.',
    isWarning: false
  };

  if (worstHour && (worstHour.totalPnl < 0 || worstHour.avgPnl < 0)) {
    const absAvg = Math.abs(worstHour.avgPnl);
    advice = {
      title: `Caution around ${worstHour.hourStr}`,
      description: `Your highest loss concentration is at ${worstHour.hourStr} with -$${absAvg >= 1 ? absAvg.toFixed(2) : absAvg.toFixed(2)} avg loss per trade across ${worstHour.tradeCount} trades.`,
      isWarning: true
    };
  } else if (bestHour && (bestHour.totalPnl > 0 || bestHour.avgPnl > 0)) {
    advice = {
      title: `Prime Performance Window: ${bestHour.hourStr}`,
      description: `Your highest edge is concentrated here with +$${bestHour.avgPnl.toFixed(2)} avg return per trade across ${bestHour.tradeCount} trades.`,
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

/**
 * Calculates Drawdown Analysis analytics and plot points for Performance Page
 */
export function calculateDrawdownAnalysis(
  trades: Trade[],
  initialBalance: number = 100000
): DrawdownAnalysisData {
  const closed = [...trades]
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime());

  if (closed.length === 0) {
    return {
      points: [],
      maxDrawdownUsd: 0,
      maxDrawdownPct: 0,
      maxDrawdownDate: '-',
      currentDrawdownUsd: 0,
      currentDrawdownPct: 0,
      hasData: false
    };
  }

  let peak = initialBalance;
  let runningBalance = initialBalance;
  let maxDrawdownUsd = 0;
  let maxDrawdownPct = 0;
  let maxDrawdownDate = '';

  const points: DrawdownPoint[] = [
    {
      index: 0,
      date: 'Start',
      fullDate: 'Initial Balance',
      timestamp: new Date(closed[0].openTime).getTime() - 1000,
      balance: initialBalance,
      peak: initialBalance,
      drawdownUsd: 0,
      drawdownPct: 0
    }
  ];

  closed.forEach((t, i) => {
    runningBalance += t.netPnl;
    if (runningBalance > peak) {
      peak = runningBalance;
    }
    const ddUsd = Math.max(0, peak - runningBalance);
    const ddPct = peak > 0 ? (ddUsd / peak) * 100 : 0;

    const tradeDate = new Date(t.closeTime || t.openTime);
    const shortDate = tradeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = tradeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (ddUsd > maxDrawdownUsd) {
      maxDrawdownUsd = ddUsd;
      maxDrawdownPct = ddPct;
      maxDrawdownDate = shortDate;
    }

    points.push({
      index: i + 1,
      date: shortDate,
      fullDate,
      timestamp: tradeDate.getTime(),
      balance: runningBalance,
      peak,
      drawdownUsd: parseFloat(ddUsd.toFixed(2)),
      drawdownPct: parseFloat(ddPct.toFixed(1)),
      tradeSymbol: t.symbol,
      tradePnl: t.netPnl
    });
  });

  const lastPoint = points[points.length - 1];

  return {
    points,
    maxDrawdownUsd: parseFloat(maxDrawdownUsd.toFixed(2)),
    maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(1)),
    maxDrawdownDate: maxDrawdownDate || points[1]?.date || 'Start',
    currentDrawdownUsd: lastPoint?.drawdownUsd || 0,
    currentDrawdownPct: lastPoint?.drawdownPct || 0,
    hasData: true
  };
}

/**
 * Calculates Streak Tracking analytics for Performance Page
 */
export function calculateStreakTracking(trades: Trade[]): StreakTrackingData {
  const closed = [...trades]
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime());

  if (closed.length === 0) {
    return {
      currentStreak: { type: 'none', count: 0 },
      longestWin: 0,
      longestLoss: 0,
      history: [],
      totalWins: 0,
      totalLosses: 0,
      hasData: false
    };
  }

  const history: StreakItem[] = [];
  let currentRunType: 'W' | 'L' | null = null;
  let currentRunCount = 0;
  let longestWin = 0;
  let longestLoss = 0;
  let totalWins = 0;
  let totalLosses = 0;

  closed.forEach((t) => {
    // Treat netPnl >= 0 as Win, netPnl < 0 as Loss
    const outcome: 'W' | 'L' = t.netPnl >= 0 ? 'W' : 'L';
    if (outcome === 'W') totalWins++;
    else totalLosses++;

    if (currentRunType === null) {
      currentRunType = outcome;
      currentRunCount = 1;
    } else if (currentRunType === outcome) {
      currentRunCount++;
    } else {
      // Previous streak completed
      history.push({
        id: `streak-${history.length}`,
        type: currentRunType,
        count: currentRunCount
      });
      if (currentRunType === 'W' && currentRunCount > longestWin) {
        longestWin = currentRunCount;
      } else if (currentRunType === 'L' && currentRunCount > longestLoss) {
        longestLoss = currentRunCount;
      }
      currentRunType = outcome;
      currentRunCount = 1;
    }
  });

  // Push final ongoing streak
  if (currentRunType !== null) {
    history.push({
      id: `streak-${history.length}`,
      type: currentRunType,
      count: currentRunCount
    });
    if (currentRunType === 'W' && currentRunCount > longestWin) {
      longestWin = currentRunCount;
    } else if (currentRunType === 'L' && currentRunCount > longestLoss) {
      longestLoss = currentRunCount;
    }
  }

  const currentStreak = {
    type: currentRunType === 'W' ? ('win' as const) : currentRunType === 'L' ? ('loss' as const) : ('none' as const),
    count: currentRunCount
  };

  return {
    currentStreak,
    longestWin,
    longestLoss,
    history,
    totalWins,
    totalLosses,
    hasData: true
  };
}

export interface AvgHoldTimeData {
  avgWinMinutes: number;
  avgLossMinutes: number;
  winTradeCount: number;
  lossTradeCount: number;
  maxDuration: number;
  diffMinutes: number;
  diffHours: number;
  isLosersLonger: boolean;
  advice: {
    message: string;
    isWarning: boolean;
  };
  hasData: boolean;
}

/**
 * Calculates Average Hold Time for Winners vs Losers (Image 1 Left)
 */
export function calculateAvgHoldTime(trades: Trade[]): AvgHoldTimeData {
  const closed = trades.filter(t => t.status === 'CLOSED');

  if (closed.length === 0) {
    return {
      avgWinMinutes: 0,
      avgLossMinutes: 0,
      winTradeCount: 0,
      lossTradeCount: 0,
      maxDuration: 1,
      diffMinutes: 0,
      diffHours: 0,
      isLosersLonger: false,
      advice: {
        message: 'No closed trades recorded yet to evaluate holding durations.',
        isWarning: false
      },
      hasData: false
    };
  }

  let totalWinMinutes = 0;
  let winCount = 0;
  let totalLossMinutes = 0;
  let lossCount = 0;

  closed.forEach(t => {
    let durationMins = 0;
    if (typeof t.durationMinutes === 'number' && t.durationMinutes > 0) {
      durationMins = t.durationMinutes;
    } else if (t.openTime && t.closeTime) {
      const openMs = new Date(t.openTime).getTime();
      const closeMs = new Date(t.closeTime).getTime();
      if (!isNaN(openMs) && !isNaN(closeMs) && closeMs >= openMs) {
        durationMins = Math.max(1, Math.round((closeMs - openMs) / 60000));
      }
    }

    if (durationMins <= 0) durationMins = 1;

    if (t.netPnl > 0.001) {
      totalWinMinutes += durationMins;
      winCount++;
    } else if (t.netPnl < -0.001) {
      totalLossMinutes += durationMins;
      lossCount++;
    }
  });

  const avgWinMinutes = winCount > 0 ? Math.round(totalWinMinutes / winCount) : 0;
  const avgLossMinutes = lossCount > 0 ? Math.round(totalLossMinutes / lossCount) : 0;
  const maxDuration = Math.max(avgWinMinutes, avgLossMinutes, 1);
  const diffMinutes = Math.abs(avgLossMinutes - avgWinMinutes);
  const diffHours = parseFloat((diffMinutes / 60).toFixed(1));
  const isLosersLonger = avgLossMinutes > avgWinMinutes;

  let adviceMessage = '';
  let isWarning = false;

  const formatDiffText = diffHours >= 1 ? `${diffHours} hrs` : `${diffMinutes} min`;

  if (winCount === 0 || lossCount === 0) {
    adviceMessage = 'Trade history currently contains only winning or only losing trades.';
    isWarning = false;
  } else if (isLosersLonger && diffMinutes >= 5) {
    adviceMessage = `You hold losing trades ${formatDiffText} longer than winners. Classic "let losers run, cut winners short" pattern.`;
    isWarning = true;
  } else if (!isLosersLonger && diffMinutes >= 5) {
    adviceMessage = `Great discipline! You let winning trades run ${formatDiffText} longer than losers.`;
    isWarning = false;
  } else {
    adviceMessage = 'Hold times are well balanced between winning and losing trades.';
    isWarning = false;
  }

  return {
    avgWinMinutes,
    avgLossMinutes,
    winTradeCount: winCount,
    lossTradeCount: lossCount,
    maxDuration,
    diffMinutes,
    diffHours,
    isLosersLonger,
    advice: {
      message: adviceMessage,
      isWarning
    },
    hasData: true
  };
}

export interface PnlHistogramBin {
  binIndex: number;
  min: number;
  max: number;
  midpoint: number;
  count: number;
  percentage: number;
  isPositive: boolean;
  totalPnlInBin: number;
}

export interface PnlDistributionHistogramData {
  bins: PnlHistogramBin[];
  maxCount: number;
  yTicks: number[];
  totalTrades: number;
  hasData: boolean;
}

/**
 * Calculates P&L Distribution Frequency Histogram (Image 1 Right)
 */
export function calculatePnlDistributionHistogram(trades: Trade[]): PnlDistributionHistogramData {
  const closed = trades.filter(t => t.status === 'CLOSED');

  if (closed.length === 0) {
    return {
      bins: [],
      maxCount: 10,
      yTicks: [0, 2, 4, 6, 8, 10],
      totalTrades: 0,
      hasData: false
    };
  }

  const lossTrades = closed.filter(t => t.netPnl < -0.001);
  const winTrades = closed.filter(t => t.netPnl >= -0.001);

  const rawBins: { min: number; max: number; isPositive: boolean }[] = [];

  // Determine negative bins
  if (lossTrades.length > 0) {
    const minLoss = Math.min(...lossTrades.map(t => t.netPnl));
    const numLossBins = Math.min(5, Math.max(3, Math.ceil(lossTrades.length / 4)));
    const lossStep = Math.abs(minLoss) / numLossBins;
    for (let i = 0; i < numLossBins; i++) {
      const bMin = minLoss + i * lossStep;
      const bMax = minLoss + (i + 1) * lossStep;
      rawBins.push({ min: bMin, max: bMax, isPositive: false });
    }
  } else {
    rawBins.push({ min: -10, max: 0, isPositive: false });
  }

  // Determine positive bins
  if (winTrades.length > 0) {
    const maxWin = Math.max(...winTrades.map(t => t.netPnl), 1);
    const numWinBins = Math.min(7, Math.max(4, Math.ceil(winTrades.length / 4)));
    const winStep = maxWin / numWinBins;
    for (let i = 0; i < numWinBins; i++) {
      const bMin = i * winStep;
      const bMax = (i + 1) * winStep;
      rawBins.push({ min: bMin, max: bMax, isPositive: true });
    }
  } else {
    rawBins.push({ min: 0, max: 10, isPositive: true });
  }

  const totalClosed = closed.length;
  const bins: PnlHistogramBin[] = rawBins.map((bin, idx) => {
    let count = 0;
    let totalPnlInBin = 0;

    closed.forEach(t => {
      const pnl = t.netPnl;
      const isLast = idx === rawBins.length - 1;
      if (idx === 0) {
        if (pnl >= bin.min && pnl <= bin.max) {
          count++;
          totalPnlInBin += pnl;
        }
      } else if (isLast) {
        if (pnl > bin.min && pnl <= bin.max) {
          count++;
          totalPnlInBin += pnl;
        }
      } else {
        if (pnl > bin.min && pnl <= bin.max) {
          count++;
          totalPnlInBin += pnl;
        }
      }
    });

    const midpoint = (bin.min + bin.max) / 2;
    const percentage = totalClosed > 0 ? Math.round((count / totalClosed) * 100) : 0;

    return {
      binIndex: idx,
      min: bin.min,
      max: bin.max,
      midpoint,
      count,
      percentage,
      isPositive: bin.isPositive,
      totalPnlInBin
    };
  });

  // Calculate dynamic maxCount and Y-ticks
  const highestCount = Math.max(...bins.map(b => b.count), 1);
  let chartMaxY = 10;
  if (highestCount <= 5) chartMaxY = 5;
  else if (highestCount <= 10) chartMaxY = 10;
  else if (highestCount <= 20) chartMaxY = 20;
  else if (highestCount <= 40) chartMaxY = 40;
  else if (highestCount <= 60) chartMaxY = 60;
  else if (highestCount <= 80) chartMaxY = 80;
  else if (highestCount <= 100) chartMaxY = 100;
  else chartMaxY = Math.ceil(highestCount / 20) * 20;

  const tickStep = chartMaxY / 4;
  const yTicks = [0, tickStep, tickStep * 2, tickStep * 3, chartMaxY];

  return {
    bins,
    maxCount: chartMaxY,
    yTicks,
    totalTrades: totalClosed,
    hasData: true
  };
}

