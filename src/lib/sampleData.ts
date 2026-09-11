import { Trade, TradingAccount, TradingStrategy } from '../types/trade';
import { DailyJournalEntry, TradingRule } from '../types/journal';
import { ChartVisionAnalysis, AICoachMessage } from '../types/ai';
import { UserProfile, RiskLimits } from '../types/settings';

export const initialAccounts: TradingAccount[] = [
  {
    id: 'acc-1',
    name: 'Prop Firm ($100k Challenge)',
    broker: 'Elefin / MT5',
    type: 'Prop Firm',
    currency: 'USD',
    initialBalance: 100000,
    currentBalance: 104850,
    isDefault: true,
    createdAt: '2026-08-01T00:00:00Z'
  },
  {
    id: 'acc-2',
    name: 'Personal MT5 Live',
    broker: 'Exness Raw',
    type: 'Live',
    currency: 'USD',
    initialBalance: 25000,
    currentBalance: 26820,
    isDefault: false,
    createdAt: '2026-08-15T00:00:00Z'
  }
];

export const initialStrategies: TradingStrategy[] = [
  {
    id: 'strat-1',
    name: 'ICT Silver Bullet',
    description: '1-hour Fair Value Gap liquidity run during London/NY open windows.',
    timeframe: '5m / 15m',
    assetClass: 'Forex / Indices',
    rules: [
      'Wait for 10:00 - 11:00 AM NY time window',
      'Identify previous session liquidity sweep',
      'Look for displacement creating Fair Value Gap (FVG)',
      'Enter on FVG tap with stop loss above displacement swing',
      'Target opposing liquidity pool minimum 1:2 RR'
    ],
    winRate: 68.4,
    totalTrades: 19,
    netPnl: 3420,
    color: '#8b5cf6'
  },
  {
    id: 'strat-2',
    name: 'Order Block & Liquidity Sweep',
    description: 'High timeframe institutional rejection block retest.',
    timeframe: '15m / 1h',
    assetClass: 'Commodities (Gold) / Forex',
    rules: [
      'Identify 4H key support/resistance order block',
      'Wait for Asian session highs/lows sweep',
      'Confirmation via market structure shift (MSS) on 5m',
      'Tight stop loss behind reaction candle'
    ],
    winRate: 72.0,
    totalTrades: 14,
    netPnl: 2840,
    color: '#10b981'
  },
  {
    id: 'strat-3',
    name: 'Break & Retest Momentum',
    description: 'Key horizontal structure breakout with volume expansion.',
    timeframe: '15m / 30m',
    assetClass: 'Crypto / Forex',
    rules: [
      'Multi-touch trendline or horizontal resistance broken',
      'Wait for clean retest of broken level as new support',
      'Candle close confirmation in direction of trend'
    ],
    winRate: 54.5,
    totalTrades: 11,
    netPnl: 1120,
    color: '#38bdf8'
  }
];

export const initialRules: TradingRule[] = [
  {
    id: 'rule-1',
    name: 'Max 1.5% Risk Per Trade',
    description: 'Never risk more than $1,500 on any single position.',
    category: 'Risk',
    enabled: true,
    isAutomated: true
  },
  {
    id: 'rule-2',
    name: 'Stop Loss Mandate',
    description: 'Every trade must have a hard stop loss placed immediately upon entry.',
    category: 'Risk',
    enabled: true,
    isAutomated: true
  },
  {
    id: 'rule-3',
    name: 'Max 2 Losses Per Day',
    description: 'Shut down trading terminal immediately after 2 consecutive daily losses.',
    category: 'Psychology',
    enabled: true,
    isAutomated: false
  },
  {
    id: 'rule-4',
    name: 'Trade Prime Sessions Only',
    description: 'Only enter trades during London Open (08:00-11:00 UTC) and NY Open (13:00-16:30 UTC).',
    category: 'Time',
    enabled: true,
    isAutomated: true
  },
  {
    id: 'rule-5',
    name: 'Evening Journal Review',
    description: 'Complete daily reflection notes and screenshot analysis before sleeping.',
    category: 'Execution',
    enabled: true,
    isAutomated: false
  }
];

export const initialRiskLimits: RiskLimits = {
  maxDailyLossUsd: 2500,
  maxDailyLossPercent: 2.5,
  maxRiskPerTradePercent: 1.5,
  maxOpenTrades: 3,
  maxTradesPerDay: 4,
  enforceRules: true
};

export const initialProfile: UserProfile = {
  name: 'Yashwant',
  email: 'trader@traderzone.local',
  bio: 'SMC & Price Action Trader specializing in Gold, EURUSD, and US30.',
  experienceLevel: 'Advanced',
  currency: 'USD',
  timezone: 'UTC+5:30',
  theme: 'dark'
};

export const initialTrades: Trade[] = [
  {
    id: 'trade-1',
    ticket: '1098234',
    accountId: 'acc-1',
    symbol: 'XAUUSD',
    assetClass: 'Commodities',
    direction: 'BUY',
    status: 'CLOSED',
    lotSize: 2.0,
    entryPrice: 2498.50,
    exitPrice: 2514.80,
    stopLoss: 2492.00,
    takeProfit: 2515.00,
    openTime: '2026-09-08T08:30:00Z',
    closeTime: '2026-09-08T11:45:00Z',
    durationMinutes: 195,
    grossPnl: 3260.00,
    commission: 14.00,
    swap: 0.00,
    netPnl: 3246.00,
    pips: 163.0,
    returnPercentage: 3.25,
    plannedRiskUsd: 1300,
    plannedRR: 2.54,
    realizedRR: 2.51,
    strategyId: 'strat-2',
    strategyName: 'Order Block & Liquidity Sweep',
    session: 'London',
    setupTags: ['Order Block', 'London Open', 'Asia Low Sweep'],
    mistakeTags: [],
    emotionalState: 'Disciplined',
    executionRating: 5,
    notes: 'Clean sweep of Asian session lows into 4H bullish order block. Waited for 5m MSS. Smooth runner straight to TP.',
    postMortem: 'Flawless execution. Followed plan to the letter.'
  },
  {
    id: 'trade-2',
    ticket: '1098240',
    accountId: 'acc-1',
    symbol: 'EURUSD',
    assetClass: 'Forex',
    direction: 'SELL',
    status: 'CLOSED',
    lotSize: 5.0,
    entryPrice: 1.08550,
    exitPrice: 1.08220,
    stopLoss: 1.08720,
    takeProfit: 1.08150,
    openTime: '2026-09-08T13:45:00Z',
    closeTime: '2026-09-08T16:10:00Z',
    durationMinutes: 145,
    grossPnl: 1650.00,
    commission: 25.00,
    swap: 0.00,
    netPnl: 1625.00,
    pips: 33.0,
    returnPercentage: 1.62,
    plannedRiskUsd: 850,
    plannedRR: 2.35,
    realizedRR: 1.94,
    strategyId: 'strat-1',
    strategyName: 'ICT Silver Bullet',
    session: 'Overlap',
    setupTags: ['Silver Bullet', 'NY Open', '15m FVG'],
    mistakeTags: [],
    emotionalState: 'Calm',
    executionRating: 4,
    notes: 'NY session Silver Bullet tap into 15m bearish FVG. Scaled out 80% at first liquidity pool.',
    postMortem: 'Good trade. Could have left trailing runner for final TP.'
  },
  {
    id: 'trade-3',
    ticket: '1098255',
    accountId: 'acc-1',
    symbol: 'GBPUSD',
    assetClass: 'Forex',
    direction: 'BUY',
    status: 'CLOSED',
    lotSize: 4.0,
    entryPrice: 1.29800,
    exitPrice: 1.29580,
    stopLoss: 1.29580,
    takeProfit: 1.30350,
    openTime: '2026-09-09T08:15:00Z',
    closeTime: '2026-09-09T09:30:00Z',
    durationMinutes: 75,
    grossPnl: -880.00,
    commission: 20.00,
    swap: 0.00,
    netPnl: -900.00,
    pips: -22.0,
    returnPercentage: -0.90,
    plannedRiskUsd: 900,
    plannedRR: 2.50,
    realizedRR: -1.00,
    strategyId: 'strat-1',
    strategyName: 'ICT Silver Bullet',
    session: 'London',
    setupTags: ['London Open', 'Bullish Displacement'],
    mistakeTags: ['Early Exit'],
    emotionalState: 'Calm',
    executionRating: 4,
    notes: 'UK GDP release spiked price through invalidation point. Stop loss held perfectly as designed.',
    postMortem: 'Acceptable loss. Risk managed tightly under 1%.'
  },
  {
    id: 'trade-4',
    ticket: '1098262',
    accountId: 'acc-1',
    symbol: 'US30',
    assetClass: 'Indices',
    direction: 'BUY',
    status: 'CLOSED',
    lotSize: 3.0,
    entryPrice: 40850.0,
    exitPrice: 41120.0,
    stopLoss: 40720.0,
    takeProfit: 41200.0,
    openTime: '2026-09-09T14:30:00Z',
    closeTime: '2026-09-09T18:00:00Z',
    durationMinutes: 210,
    grossPnl: 2700.00,
    commission: 18.00,
    swap: 0.00,
    netPnl: 2682.00,
    pips: 270.0,
    returnPercentage: 2.68,
    plannedRiskUsd: 1300,
    plannedRR: 2.69,
    realizedRR: 2.08,
    strategyId: 'strat-3',
    strategyName: 'Break & Retest Momentum',
    session: 'New York',
    setupTags: ['Wall St Open', 'Breakout Retest'],
    mistakeTags: [],
    emotionalState: 'Confident',
    executionRating: 5,
    notes: 'Premarket consolidation break at NY bell with high institutional volume.',
    postMortem: 'Targeted daily high. Clean trend day.'
  },
  {
    id: 'trade-5',
    ticket: '1098270',
    accountId: 'acc-1',
    symbol: 'BTCUSD',
    assetClass: 'Crypto',
    direction: 'BUY',
    status: 'CLOSED',
    lotSize: 1.0,
    entryPrice: 56200.0,
    exitPrice: 57450.0,
    stopLoss: 55600.0,
    takeProfit: 57800.0,
    openTime: '2026-09-10T02:00:00Z',
    closeTime: '2026-09-10T10:30:00Z',
    durationMinutes: 510,
    grossPnl: 1250.00,
    commission: 12.00,
    swap: 4.00,
    netPnl: 1234.00,
    pips: 1250.0,
    returnPercentage: 1.23,
    plannedRiskUsd: 600,
    plannedRR: 2.67,
    realizedRR: 2.08,
    strategyId: 'strat-2',
    strategyName: 'Order Block & Liquidity Sweep',
    session: 'Asian',
    setupTags: ['Crypto Weekend Sweep', 'Support Bounce'],
    mistakeTags: [],
    emotionalState: 'Calm',
    executionRating: 4,
    notes: 'Support tap on daily 200 EMA. Held through Asian session.',
    postMortem: 'Good patience.'
  },
  {
    id: 'trade-6',
    ticket: '1098284',
    accountId: 'acc-1',
    symbol: 'XAUUSD',
    assetClass: 'Commodities',
    direction: 'SELL',
    status: 'CLOSED',
    lotSize: 2.5,
    entryPrice: 2518.20,
    exitPrice: 2524.50,
    stopLoss: 2524.50,
    takeProfit: 2502.00,
    openTime: '2026-09-10T13:30:00Z',
    closeTime: '2026-09-10T14:15:00Z',
    durationMinutes: 45,
    grossPnl: -1575.00,
    commission: 15.00,
    swap: 0.00,
    netPnl: -1590.00,
    pips: -63.0,
    returnPercentage: -1.58,
    plannedRiskUsd: 1575,
    plannedRR: 2.57,
    realizedRR: -1.00,
    strategyId: 'strat-1',
    strategyName: 'ICT Silver Bullet',
    session: 'Overlap',
    setupTags: ['Resistance Tap'],
    mistakeTags: ['Chased Entry'],
    emotionalState: 'Impatient',
    executionRating: 2,
    notes: 'Entered before candle close. Strong CPI print caused sudden upside breakout.',
    postMortem: 'Mistake: Traded right into high impact news without waiting for volatility to settle.'
  },
  {
    id: 'trade-7',
    ticket: '1098299',
    accountId: 'acc-1',
    symbol: 'EURUSD',
    assetClass: 'Forex',
    direction: 'BUY',
    status: 'OPEN',
    lotSize: 3.0,
    entryPrice: 1.08420,
    stopLoss: 1.08150,
    takeProfit: 1.09100,
    openTime: '2026-09-11T12:00:00Z',
    grossPnl: 360.00,
    commission: 15.00,
    swap: 0.00,
    netPnl: 345.00,
    pips: 12.0,
    returnPercentage: 0.35,
    plannedRiskUsd: 810,
    plannedRR: 2.52,
    session: 'London',
    strategyId: 'strat-1',
    strategyName: 'ICT Silver Bullet',
    setupTags: ['London FVG', 'Trend Continuation'],
    mistakeTags: [],
    emotionalState: 'Disciplined',
    executionRating: 5,
    notes: 'Current active trade. Stop loss in profit (+5 pips). Riding towards 1.0910 target.'
  }
];

export const initialJournalEntries: DailyJournalEntry[] = [
  {
    id: 'journal-2026-09-08',
    date: '2026-09-08',
    accountId: 'acc-1',
    reflectionNotes: 'Tremendous day! Gold gave an incredible reaction at the 4H OB. Managed to capture 163 pips and followed up with EURUSD in the afternoon.',
    preMarketPlan: 'Focus strictly on London open gold reaction. If no setup, wait for NY 13:30 open.',
    mood: 'Confident',
    rating: 5,
    rulesFollowed: {
      'rule-1': true,
      'rule-2': true,
      'rule-3': true,
      'rule-4': true,
      'rule-5': true
    },
    marketConditions: 'Trending',
    updatedAt: '2026-09-08T20:00:00Z'
  },
  {
    id: 'journal-2026-09-09',
    date: '2026-09-09',
    accountId: 'acc-1',
    reflectionNotes: 'Took a controlled loss on GBPUSD morning news spike. Maintained composure, avoided revenge trading, and found a clean US30 setup later.',
    preMarketPlan: 'Be cautious around UK data release at 08:30 UTC.',
    mood: 'Disciplined',
    rating: 4,
    rulesFollowed: {
      'rule-1': true,
      'rule-2': true,
      'rule-3': true,
      'rule-4': true,
      'rule-5': true
    },
    marketConditions: 'High Volatility',
    updatedAt: '2026-09-09T21:00:00Z'
  },
  {
    id: 'journal-2026-09-10',
    date: '2026-09-10',
    accountId: 'acc-1',
    reflectionNotes: 'Made an error trading Gold immediately ahead of CPI news. Stopped out. I stepped away from the screen to avoid revenge trading.',
    preMarketPlan: 'Review CPI forecast numbers.',
    mood: 'Impatient',
    rating: 2,
    rulesFollowed: {
      'rule-1': true,
      'rule-2': true,
      'rule-3': true,
      'rule-4': false,
      'rule-5': true
    },
    marketConditions: 'News Driven',
    updatedAt: '2026-09-10T19:30:00Z'
  }
];

export const initialChartVision: ChartVisionAnalysis[] = [
  {
    id: 'vision-1',
    date: '2026-09-10T15:00:00Z',
    symbol: 'XAUUSD',
    timeframe: '15m',
    direction: 'BUY',
    marketStructure: 'Order Block Retest',
    confidenceScore: 88,
    keyLevels: {
      support: [2508.5, 2498.0],
      resistance: [2528.0, 2540.0],
      invalidation: 2504.0,
      target1: 2528.0,
      target2: 2538.5
    },
    tradePlan: {
      recommendedEntry: 2512.0,
      stopLoss: 2504.0,
      takeProfit: 2532.0,
      riskRewardRatio: 2.5,
      summary: 'Confirmed bullish market structure shift on 15m timeframe following liquidity sweep of Asian session lows. FVG unfilled between 2510-2513.',
      action: 'CONFIRMED SETUP'
    },
    chartImageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80'
  }
];

export const initialAICoachMessages: AICoachMessage[] = [
  {
    id: 'msg-1',
    sender: 'coach',
    text: 'Welcome to Trader Zone AI Coach! I analyze your trades in real-time to eliminate emotional leaks, protect your capital, and optimize your risk-to-reward ratio.',
    timestamp: '2026-09-11T10:00:00Z',
    tag: 'Psychology'
  },
  {
    id: 'msg-2',
    sender: 'coach',
    text: '📊 **Performance Insight**: Your EURUSD longs in London session have an 82% win rate. However, on September 10th you took a loss by jumping into Gold before high-impact CPI. Remember rule #4: never front-run major red-folder news.',
    timestamp: '2026-09-11T10:01:00Z',
    tag: 'Risk'
  }
];
