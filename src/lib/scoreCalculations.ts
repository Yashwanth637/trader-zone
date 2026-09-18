import { Trade } from '../types/trade';
import { SummaryStats } from './calculations';

export interface ScoreDimension {
  key: string;
  name: string;
  score: number;
  info: string;
}

export interface TradeScoreResult {
  overallScore: number;
  ratingLabel: string;
  ratingColor: string;
  dimensions: {
    winRate: number;
    riskReward: number;
    consistency: number;
    maxDrawdown: number;
    profitability: number;
    recovery: number;
  };
  dimensionList: ScoreDimension[];
}

export interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  month: string;   // e.g. "Aug"
  dayOfMonth: number;
  tradeCount: number;
  netPnl: number;
  status: 'win' | 'loss' | 'be';
}

export interface TradingActivityStats {
  totalTradesInYear: number;
  year: number;
  daysTraded: number;
  greenDays: number;
  redDays: number;
  dailyWinRate: number;
  currentStreak: number;
  longestStreak: number;
  totalPnl: number;
  avgPnlPerDay: number;
  bestDay: {
    pnl: number;
    date: string;
    tradeCount: number;
  } | null;
  worstDay: {
    pnl: number;
    date: string;
    tradeCount: number;
  } | null;
  monthlyDots: {
    month: string;
    days: { status: 'win' | 'loss'; pnl: number; date: string }[];
  }[];
}

export interface SymbolStat {
  symbol: string;
  netPnl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
}

export interface WeekdayStat {
  dayName: string;
  shortName: string; // Mon, Tue, Wed, Thu, Fri
  dayIndex: number;  // 1 = Mon, 5 = Fri
  netPnl: number;
  tradeCount: number;
}

export interface AITip {
  icon: 'bulb' | 'chart' | 'check';
  text: string;
}

/**
 * Calculates 6 performance dimensions (0-100) and overall score
 */
export function calculateTradeScores(trades: Trade[], stats: SummaryStats): TradeScoreResult {
  const closed = trades.filter(t => t.status === 'CLOSED');

  if (closed.length === 0) {
    const defaultDims = {
      winRate: 50,
      riskReward: 50,
      consistency: 50,
      maxDrawdown: 100,
      profitability: 50,
      recovery: 50
    };
    return {
      overallScore: 50,
      ratingLabel: 'Intermediate',
      ratingColor: 'text-amber-500',
      dimensions: defaultDims,
      dimensionList: buildDimensionList(defaultDims)
    };
  }

  // 1. Win Rate Score (0-100)
  // 50% -> 60, 60% -> 75, 75%+ -> 95-100
  const winRateScore = Math.min(100, Math.max(5, Math.round(stats.winRate * 1.25)));

  // 2. Risk/Reward Score (0-100)
  // Based on win/loss ratio (avgWin / avgLoss)
  const ratio = stats.avgLoss > 0 ? stats.avgWin / stats.avgLoss : stats.avgWin > 0 ? 2.5 : 1;
  const riskRewardScore = Math.min(100, Math.max(10, Math.round(ratio * 38)));

  // 3. Consistency Score (0-100)
  // Measures position sizing standard deviation and steady gains
  const lotSizes = closed.map(t => t.lotSize || 0.1);
  const avgLot = lotSizes.reduce((s, l) => s + l, 0) / lotSizes.length || 0.1;
  const lotVariance = lotSizes.reduce((s, l) => s + Math.pow(l - avgLot, 2), 0) / lotSizes.length;
  const lotStdDev = Math.sqrt(lotVariance);
  const lotCV = avgLot > 0 ? lotStdDev / avgLot : 0; // Coefficient of variation
  const lotScore = Math.max(20, Math.min(100, Math.round(100 - lotCV * 45)));

  // Also factor break-even adherence & trade frequency
  const consistencyScore = Math.min(100, Math.max(15, Math.round(lotScore * 0.7 + (stats.winRate > 40 ? 25 : 10))));

  // 4. Max Drawdown Score (0-100)
  // Low DD = High Score. DD <= 2% -> 95+, DD 5% -> 75, DD 10% -> 50, DD > 20% -> 20
  const ddPct = stats.maxDrawdownPercent;
  let maxDrawdownScore = 100;
  if (ddPct <= 1.5) {
    maxDrawdownScore = 98;
  } else if (ddPct <= 3.0) {
    maxDrawdownScore = 90;
  } else if (ddPct <= 5.0) {
    maxDrawdownScore = 78;
  } else if (ddPct <= 8.0) {
    maxDrawdownScore = 60;
  } else if (ddPct <= 15.0) {
    maxDrawdownScore = 40;
  } else {
    maxDrawdownScore = Math.max(10, Math.round(100 - ddPct * 3.5));
  }

  // 5. Profitability Score (0-100)
  // Based on profit factor (PF 1.72 -> ~72, PF 2.5+ -> 95+)
  const pf = stats.profitFactor;
  let profitabilityScore = 50;
  if (pf >= 2.5) {
    profitabilityScore = 96;
  } else if (pf >= 2.0) {
    profitabilityScore = 88;
  } else if (pf >= 1.5) {
    profitabilityScore = Math.min(85, Math.round(pf * 42));
  } else if (pf >= 1.0) {
    profitabilityScore = Math.round(pf * 40);
  } else {
    profitabilityScore = Math.max(10, Math.round(pf * 45));
  }

  // 6. Recovery Score (0-100)
  // Measures recovery after drawdowns: Net profit vs max drawdown
  let recoveryScore = 75;
  if (stats.maxDrawdownUsd > 0) {
    const recoveryRatio = stats.netPnl / stats.maxDrawdownUsd;
    if (recoveryRatio >= 3) recoveryScore = 95;
    else if (recoveryRatio >= 2) recoveryScore = 88;
    else if (recoveryRatio >= 1) recoveryScore = 75;
    else if (recoveryRatio >= 0) recoveryScore = 60;
    else recoveryScore = 30;
  } else if (stats.netPnl > 0) {
    recoveryScore = 92;
  }

  // Overall Score: Weighted average
  const overallScore = Math.round(
    winRateScore * 0.2 +
    riskRewardScore * 0.2 +
    consistencyScore * 0.15 +
    maxDrawdownScore * 0.15 +
    profitabilityScore * 0.2 +
    recoveryScore * 0.1
  );

  let ratingLabel = 'Intermediate';
  let ratingColor = 'text-amber-500';

  if (overallScore >= 80) {
    ratingLabel = 'Elite';
    ratingColor = 'text-emerald-400';
  } else if (overallScore >= 65) {
    ratingLabel = 'Improving';
    ratingColor = 'text-amber-400';
  } else if (overallScore >= 50) {
    ratingLabel = 'Intermediate';
    ratingColor = 'text-sky-400';
  } else {
    ratingLabel = 'Developing';
    ratingColor = 'text-rose-400';
  }

  const dimensions = {
    winRate: winRateScore,
    riskReward: riskRewardScore,
    consistency: consistencyScore,
    maxDrawdown: maxDrawdownScore,
    profitability: profitabilityScore,
    recovery: recoveryScore
  };

  return {
    overallScore,
    ratingLabel,
    ratingColor,
    dimensions,
    dimensionList: buildDimensionList(dimensions)
  };
}

function buildDimensionList(dims: {
  winRate: number;
  riskReward: number;
  consistency: number;
  maxDrawdown: number;
  profitability: number;
  recovery: number;
}): ScoreDimension[] {
  return [
    { key: 'winRate', name: 'Win Rate', score: dims.winRate, info: 'Percentage of profitable trades executed' },
    { key: 'riskReward', name: 'Risk/Reward', score: dims.riskReward, info: 'Ratio of average winning trade to average losing trade' },
    { key: 'consistency', name: 'Consistency', score: dims.consistency, info: 'Lot size discipline and adherence to risk parameters' },
    { key: 'maxDrawdown', name: 'Max Drawdown', score: dims.maxDrawdown, info: 'Resilience against peak-to-trough capital decline' },
    { key: 'profitability', name: 'Profitability', score: dims.profitability, info: 'Gross profit generated relative to gross losses' },
    { key: 'recovery', name: 'Recovery', score: dims.recovery, info: 'Speed and magnitude of bouncing back after losses' }
  ];
}

/**
 * Calculates calendar day activity, streaks, best/worst days, and monthly heat dots
 */
export function calculateTradingActivity(trades: Trade[]): TradingActivityStats {
  const currentYear = new Date().getFullYear();
  const closed = trades.filter(t => t.status === 'CLOSED');

  // Filter trades for this year (or fallback to all closed if current year has few)
  const thisYearTrades = closed.filter(t => {
    const d = new Date(t.closeTime || t.openTime);
    return d.getFullYear() === currentYear;
  });

  const activeTrades = thisYearTrades.length > 0 ? thisYearTrades : closed;
  const totalTradesInYear = activeTrades.length;

  // Group trades by day (YYYY-MM-DD)
  const dayMap: Record<string, { pnl: number; count: number; date: Date }> = {};

  activeTrades.forEach(t => {
    const d = new Date(t.closeTime || t.openTime);
    const key = d.toISOString().split('T')[0];
    if (!dayMap[key]) {
      dayMap[key] = { pnl: 0, count: 0, date: d };
    }
    dayMap[key].pnl += t.netPnl;
    dayMap[key].count += 1;
  });

  const daysList = Object.entries(dayMap).map(([dateStr, data]) => ({
    dateStr,
    pnl: parseFloat(data.pnl.toFixed(2)),
    count: data.count,
    date: data.date
  })).sort((a, b) => a.date.getTime() - b.date.getTime());

  const daysTraded = daysList.length;
  let greenDays = 0;
  let redDays = 0;
  let totalPnl = 0;
  let bestDay: { pnl: number; date: string; tradeCount: number } | null = null;
  let worstDay: { pnl: number; date: string; tradeCount: number } | null = null;

  daysList.forEach(day => {
    totalPnl += day.pnl;
    const formattedDate = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (day.pnl > 0.01) {
      greenDays++;
      if (!bestDay || day.pnl > bestDay.pnl) {
        bestDay = { pnl: day.pnl, date: formattedDate, tradeCount: day.count };
      }
    } else if (day.pnl < -0.01) {
      redDays++;
      if (!worstDay || day.pnl < worstDay.pnl) {
        worstDay = { pnl: day.pnl, date: formattedDate, tradeCount: day.count };
      }
    }
  });

  const dailyWinRate = (greenDays + redDays) > 0 ? (greenDays / (greenDays + redDays)) * 100 : 0;
  const avgPnlPerDay = daysTraded > 0 ? totalPnl / daysTraded : 0;

  // Streak calculations (winning streaks)
  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  daysList.forEach(day => {
    if (day.pnl > 0.01) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else if (day.pnl < -0.01) {
      tempStreak = 0;
    }
  });

  // Current streak from latest traded day backwards
  const reversedDays = [...daysList].reverse();
  if (reversedDays.length > 0) {
    const firstPnl = reversedDays[0].pnl;
    if (firstPnl > 0.01) {
      for (const d of reversedDays) {
        if (d.pnl > 0.01) currentStreak++;
        else break;
      }
    } else if (firstPnl < -0.01) {
      for (const d of reversedDays) {
        if (d.pnl < -0.01) currentStreak--;
        else break;
      }
    }
  }

  // Monthly Dot Matrix (all 12 months of the year for horizontal scrolling)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const targetMonths = monthNames;

  const monthlyDots = targetMonths.map(month => {
    const daysInMonth = daysList.filter(d => {
      const m = monthNames[d.date.getMonth()];
      return m === month;
    }).map(d => ({
      status: (d.pnl >= 0 ? 'win' : 'loss') as 'win' | 'loss',
      pnl: d.pnl,
      date: d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    return {
      month,
      days: daysInMonth
    };
  });

  return {
    totalTradesInYear,
    year: currentYear,
    daysTraded,
    greenDays,
    redDays,
    dailyWinRate: parseFloat(dailyWinRate.toFixed(1)),
    currentStreak,
    longestStreak,
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    avgPnlPerDay: parseFloat(avgPnlPerDay.toFixed(2)),
    bestDay,
    worstDay,
    monthlyDots
  };
}

/**
 * Calculates P&L and Win Rate grouped by Symbol for Image 2
 */
export function calculateSymbolBreakdowns(trades: Trade[]): {
  pnlBySymbol: SymbolStat[];
  winRateBySymbol: SymbolStat[];
} {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const symbolMap: Record<string, { pnl: number; total: number; wins: number }> = {};

  closed.forEach(t => {
    const sym = t.symbol.toUpperCase();
    if (!symbolMap[sym]) {
      symbolMap[sym] = { pnl: 0, total: 0, wins: 0 };
    }
    symbolMap[sym].pnl += t.netPnl;
    symbolMap[sym].total += 1;
    if (t.netPnl > 0.01) {
      symbolMap[sym].wins += 1;
    }
  });

  const list: SymbolStat[] = Object.entries(symbolMap).map(([symbol, data]) => ({
    symbol,
    netPnl: parseFloat(data.pnl.toFixed(2)),
    winRate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
    totalTrades: data.total,
    winningTrades: data.wins
  }));

  // P&L by Symbol sorted descending by net P&L
  const pnlBySymbol = [...list].sort((a, b) => b.netPnl - a.netPnl);

  // Win Rate by Symbol sorted by trade volume
  const winRateBySymbol = [...list].sort((a, b) => b.totalTrades - a.totalTrades);

  return { pnlBySymbol, winRateBySymbol };
}

/**
 * Calculates net P&L grouped by weekday (Monday to Friday) for Image 2
 */
export function calculateWeekdayStats(trades: Trade[]): WeekdayStat[] {
  const weekdays = [
    { dayName: 'Monday', shortName: 'Mon', dayIndex: 1 },
    { dayName: 'Tuesday', shortName: 'Tue', dayIndex: 2 },
    { dayName: 'Wednesday', shortName: 'Wed', dayIndex: 3 },
    { dayName: 'Thursday', shortName: 'Thu', dayIndex: 4 },
    { dayName: 'Friday', shortName: 'Fri', dayIndex: 5 }
  ];

  const closed = trades.filter(t => t.status === 'CLOSED');
  const pnlByDay: Record<number, { pnl: number; count: number }> = {
    1: { pnl: 0, count: 0 },
    2: { pnl: 0, count: 0 },
    3: { pnl: 0, count: 0 },
    4: { pnl: 0, count: 0 },
    5: { pnl: 0, count: 0 }
  };

  closed.forEach(t => {
    const d = new Date(t.closeTime || t.openTime);
    const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri
    if (pnlByDay[day]) {
      pnlByDay[day].pnl += t.netPnl;
      pnlByDay[day].count += 1;
    }
  });

  return weekdays.map(w => ({
    dayName: w.dayName,
    shortName: w.shortName,
    dayIndex: w.dayIndex,
    netPnl: parseFloat(pnlByDay[w.dayIndex].pnl.toFixed(2)),
    tradeCount: pnlByDay[w.dayIndex].count
  }));
}

/**
 * Generates dynamic AI Improvement Tips based on lowest scoring dimensions
 */
export function generateAITips(dimensions: {
  winRate: number;
  riskReward: number;
  consistency: number;
  maxDrawdown: number;
  profitability: number;
  recovery: number;
}): AITip[] {
  const tips: AITip[] = [];

  // Sort dimensions from lowest to highest
  const sortedDims = Object.entries(dimensions).sort((a, b) => a[1] - b[1]);
  const lowestKey = sortedDims[0][0];
  const secondLowestKey = sortedDims[1][0];

  // Tip 1 based on lowest dimension
  if (lowestKey === 'maxDrawdown') {
    tips.push({
      icon: 'bulb',
      text: 'Reduce risk per trade to limit your peak-to-trough drawdown'
    });
  } else if (lowestKey === 'winRate') {
    tips.push({
      icon: 'bulb',
      text: 'Work on your entry timing and setup selection to raise win rate'
    });
  } else if (lowestKey === 'riskReward') {
    tips.push({
      icon: 'bulb',
      text: 'Aim for a minimum 1.5:1 reward-to-risk target before pulling the trigger'
    });
  } else if (lowestKey === 'consistency') {
    tips.push({
      icon: 'bulb',
      text: 'Standardize your position sizing to prevent outsized losses from hurting equity'
    });
  } else {
    tips.push({
      icon: 'bulb',
      text: 'Protect gains by trailing stop losses once trade reaches 1R profit'
    });
  }

  // Tip 2 based on second lowest dimension
  if (secondLowestKey === 'winRate' && lowestKey !== 'winRate') {
    tips.push({
      icon: 'chart',
      text: 'Focus on your highest probability trade setups during peak market sessions'
    });
  } else if (secondLowestKey === 'consistency' && lowestKey !== 'consistency') {
    tips.push({
      icon: 'chart',
      text: 'Maintain uniform lot sizing across all currency and commodity setups'
    });
  } else if (secondLowestKey === 'recovery' || lowestKey === 'recovery') {
    tips.push({
      icon: 'chart',
      text: 'Take a short pause after 2 consecutive losses to reset psychology'
    });
  } else {
    tips.push({
      icon: 'chart',
      text: 'Refine your execution playbook by reviewing your top winning trade setups'
    });
  }

  // Tip 3: Positive milestone / encouragement
  tips.push({
    icon: 'check',
    text: 'Solid trading! Focus on your weakest dimension to reach elite status'
  });

  return tips;
}
