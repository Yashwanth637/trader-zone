import { Trade, TradingAccount, PropFirmName, PropStage, PropFirmAccountData } from '../types/trade';

export const PROP_FIRMS: PropFirmName[] = [
  'Funded Room',
  'Funded Firm',
  'Funding Pips'
];

export const LIVE_BROKERS = [
  'Delta Exchange India',
  'MetaTrader 5',
  'MetaTrader 4',
  'Exness',
  'Vantage',
  'XM Global',
  'Binance'
];

export interface AccountValuationTier {
  label: string;
  value: number;
}

export const PROP_FIRM_VALUATION_TIERS: AccountValuationTier[] = [
  { label: '$2.5k', value: 2500 },
  { label: '$5,000', value: 5000 },
  { label: '$10,000', value: 10000 },
  { label: '$25,000', value: 25000 },
  { label: '$50,000', value: 50000 },
  { label: '$100,000', value: 100000 }
];

export interface StageRuleDefinition {
  name: string;
  subtitle: string;
  profitTargetPercent: number | null; // null for funded
  minTradingDays: number;
  minDailyPnlPercentForDayCount: number; // 0.25%
  maxDailyLossPercent: number; // 5% eval, 3% funded
  maxTotalLossPercent: number; // 10% eval, 6% funded
  maxRiskPerTradePercent?: number; // 3% for funded
  consistencyRulePercent?: number; // 15% for funded
  sub1MinTradesCapPercent?: number; // 10% max sub-1-min trades
  leverage: string;
  tradingPeriod: string;
}

export const FUNDED_ROOM_RULES: Record<PropStage, StageRuleDefinition> = {
  stage1: {
    name: 'Stage 1 (Evaluation Phase 1)',
    subtitle: 'Achieve an 8% profit target with minimum 5 trading days without breaching drawdown.',
    profitTargetPercent: 8,
    minTradingDays: 5,
    minDailyPnlPercentForDayCount: 0.25,
    maxDailyLossPercent: 5,
    maxTotalLossPercent: 10,
    sub1MinTradesCapPercent: 10,
    leverage: 'Forex 1:100 · Commodities 1:30 · Crypto 1:2',
    tradingPeriod: 'Unlimited'
  },
  stage2: {
    name: 'Stage 2 (Evaluation Phase 2)',
    subtitle: 'Achieve a 5% profit target to prove consistency and receive your funded account.',
    profitTargetPercent: 5,
    minTradingDays: 5,
    minDailyPnlPercentForDayCount: 0.25,
    maxDailyLossPercent: 5,
    maxTotalLossPercent: 10,
    sub1MinTradesCapPercent: 10,
    leverage: 'Forex 1:100 · Commodities 1:30 · Crypto 1:2',
    tradingPeriod: 'Unlimited'
  },
  funded: {
    name: 'Funded Stage',
    subtitle: 'Trade live simulated capital with 3% daily loss limit, 6% total drawdown, and 15% consistency.',
    profitTargetPercent: null,
    minTradingDays: 7,
    minDailyPnlPercentForDayCount: 0.25,
    maxDailyLossPercent: 3,
    maxTotalLossPercent: 6,
    maxRiskPerTradePercent: 3,
    consistencyRulePercent: 15,
    sub1MinTradesCapPercent: 10,
    leverage: 'Forex 1:100 · Commodities 1:30 · Crypto 1:2',
    tradingPeriod: 'Unlimited'
  }
};

/**
 * Initialize default prop firm data for a newly created account
 */
export function initializePropFirmData(firmName: PropFirmName, initialBalance: number): PropFirmAccountData {
  return {
    firmName,
    currentStage: 'stage1',
    accountTier: initialBalance,
    stages: {
      stage1: {
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        startingBalance: initialBalance
      },
      stage2: {
        status: 'LOCKED',
        startingBalance: initialBalance
      },
      funded: {
        status: 'LOCKED',
        startingBalance: initialBalance
      }
    }
  };
}

export interface PropStageMetrics {
  stageKey: PropStage;
  rule: StageRuleDefinition;
  startingBalance: number;
  currentBalance: number;
  currentEquity: number;
  realizedPnl: number;
  pnlPercent: number;
  
  // Profit Target
  targetAmount: number | null;
  targetDonePercent: number;
  targetRemaining: number;
  isTargetAchieved: boolean;
  
  // Trading Days
  qualifyingDaysCount: number;
  minTradingDays: number;
  isTradingDaysAchieved: boolean;
  qualifyingDates: string[];
  
  // Daily Loss
  maxDailyLossAmount: number;
  todayLoss: number;
  dailyLossRemaining: number;
  dailyLossUsedPercent: number;
  isDailyLossBreached: boolean;
  
  // Total Drawdown
  maxTotalLossAmount: number;
  totalDrawdown: number;
  maxLossRemaining: number;
  maxLossUsedPercent: number;
  isMaxLossBreached: boolean;
  
  // Sub 1-min Execution rule
  sub1MinTradesCount: number;
  sub1MinTradesPercent: number;
  isSub1MinCompliant: boolean;
  
  // Stage Completion
  isPassed: boolean;
  isFailed: boolean;
  stageTradesCount: number;
}

/**
 * Calculate live metrics and objectives tracking for a given stage
 */
export function calculatePropStageMetrics(
  account: TradingAccount,
  allAccountTrades: Trade[],
  stageKey: PropStage
): PropStageMetrics {
  const rule = FUNDED_ROOM_RULES[stageKey];
  const startingBalance = account.initialBalance || 5000;
  
  // Filter trades for this stage:
  // If trade has propStage, match it; if not specified, default to stage1 for backwards compatibility
  const stageTrades = allAccountTrades.filter(t => {
    if (t.accountId !== account.id) return false;
    const tStage = t.propStage || 'stage1';
    return tStage === stageKey;
  });

  // Calculate realized PnL for this stage
  const realizedPnl = stageTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
  const currentBalance = startingBalance + realizedPnl;
  const currentEquity = currentBalance; // Or unrealized if open trades exist
  const pnlPercent = startingBalance > 0 ? (realizedPnl / startingBalance) * 100 : 0;

  // 1. Profit Target
  const targetAmount = rule.profitTargetPercent !== null
    ? (startingBalance * rule.profitTargetPercent) / 100
    : null;
    
  let targetDonePercent = 0;
  let targetRemaining = 0;
  let isTargetAchieved = true;

  if (targetAmount !== null) {
    targetDonePercent = Math.max(0, Math.min(100, (realizedPnl / targetAmount) * 100));
    targetRemaining = Math.max(0, targetAmount - realizedPnl);
    isTargetAchieved = realizedPnl >= targetAmount;
  }

  // 2. Minimum Trading Days (Day counts when |daily PnL %| >= 0.25%)
  const dailyPnLMap = new Map<string, number>();
  stageTrades.forEach(t => {
    if (!t.closeTime) return;
    const dateStr = t.closeTime.split('T')[0];
    const prev = dailyPnLMap.get(dateStr) || 0;
    dailyPnLMap.set(dateStr, prev + (t.netPnl || 0));
  });

  const qualifyingDates: string[] = [];
  dailyPnLMap.forEach((dayPnl, dateStr) => {
    const movePercent = (Math.abs(dayPnl) / startingBalance) * 100;
    if (movePercent >= rule.minDailyPnlPercentForDayCount) {
      qualifyingDates.push(dateStr);
    }
  });

  const qualifyingDaysCount = qualifyingDates.length;
  const isTradingDaysAchieved = qualifyingDaysCount >= rule.minTradingDays;

  // 3. Daily Loss Calculation (from daily start equity / 2 AM UTC)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayPnl = dailyPnLMap.get(todayDateStr) || 0;
  const todayLoss = todayPnl < 0 ? Math.abs(todayPnl) : 0;
  
  const maxDailyLossAmount = (startingBalance * rule.maxDailyLossPercent) / 100;
  const dailyLossRemaining = Math.max(0, maxDailyLossAmount - todayLoss);
  const dailyLossUsedPercent = maxDailyLossAmount > 0
    ? Math.min(100, (todayLoss / maxDailyLossAmount) * 100)
    : 0;
  const isDailyLossBreached = todayLoss > maxDailyLossAmount;

  // 4. Maximum Total Loss (Static Drawdown from initial balance)
  const totalDrawdown = Math.max(0, startingBalance - currentBalance);
  const maxTotalLossAmount = (startingBalance * rule.maxTotalLossPercent) / 100;
  const maxLossRemaining = Math.max(0, maxTotalLossAmount - totalDrawdown);
  const maxLossUsedPercent = maxTotalLossAmount > 0
    ? Math.min(100, (totalDrawdown / maxTotalLossAmount) * 100)
    : 0;
  const isMaxLossBreached = totalDrawdown > maxTotalLossAmount;

  // 5. Sub-1-Minute Trades Rule
  const sub1MinTradesCount = stageTrades.filter(t => {
    if (t.durationMinutes !== undefined) return t.durationMinutes < 1;
    if (t.openTime && t.closeTime) {
      const diffMs = new Date(t.closeTime).getTime() - new Date(t.openTime).getTime();
      return diffMs > 0 && diffMs < 60000;
    }
    return false;
  }).length;

  const sub1MinTradesPercent = stageTrades.length > 0
    ? parseFloat(((sub1MinTradesCount / stageTrades.length) * 100).toFixed(1))
    : 0;
  const isSub1MinCompliant = sub1MinTradesPercent <= (rule.sub1MinTradesCapPercent || 10);

  // Overall Stage Status
  const isFailed = isDailyLossBreached || isMaxLossBreached;
  const isPassed = !isFailed && isTargetAchieved && isTradingDaysAchieved && isSub1MinCompliant;

  return {
    stageKey,
    rule,
    startingBalance,
    currentBalance,
    currentEquity,
    realizedPnl,
    pnlPercent,
    targetAmount,
    targetDonePercent,
    targetRemaining,
    isTargetAchieved,
    qualifyingDaysCount,
    minTradingDays: rule.minTradingDays,
    isTradingDaysAchieved,
    qualifyingDates,
    maxDailyLossAmount,
    todayLoss,
    dailyLossRemaining,
    dailyLossUsedPercent,
    isDailyLossBreached,
    maxTotalLossAmount,
    totalDrawdown,
    maxLossRemaining,
    maxLossUsedPercent,
    isMaxLossBreached,
    sub1MinTradesCount,
    sub1MinTradesPercent,
    isSub1MinCompliant,
    isPassed,
    isFailed,
    stageTradesCount: stageTrades.length
  };
}
