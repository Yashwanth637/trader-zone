export type Direction = 'BUY' | 'SELL';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type AssetClass = 'Forex' | 'Crypto' | 'Indices' | 'Commodities' | 'Stocks';
export type TradingSession = 'Asian' | 'London' | 'New York' | 'Overlap' | 'Off-Hours';

export type EmotionalState = 
  | 'Disciplined' 
  | 'Calm' 
  | 'Confident' 
  | 'FOMO' 
  | 'Revenge' 
  | 'Greedy' 
  | 'Fearful' 
  | 'Anxious' 
  | 'Impatient';

export type MistakeTag = 
  | 'Early Exit' 
  | 'Moved Stop Loss' 
  | 'Over-leveraged' 
  | 'Chased Entry' 
  | 'Traded Outside Hours' 
  | 'Revenge Sizing' 
  | 'No Stop Loss' 
  | 'Ignored Plan';

export interface Trade {
  id: string;
  ticket: string;
  accountId: string;
  symbol: string;
  assetClass: AssetClass;
  direction: Direction;
  status: TradeStatus;
  
  // Execution
  lotSize: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  closedBy?: 'TP' | 'SL' | 'User';
  
  openTime: string; // ISO string
  closeTime?: string; // ISO string
  durationMinutes?: number;
  
  // Financials
  grossPnl?: number;
  commission: number;
  swap: number;
  netPnl: number;
  pips?: number;
  returnPercentage?: number;
  
  // Risk & Setup
  plannedRiskUsd?: number;
  plannedRR?: number;
  realizedRR?: number;
  strategyId?: string;
  strategyName?: string;
  session: TradingSession;
  
  // Psychology & Review
  setupTags: string[];
  mistakeTags: MistakeTag[];
  emotionalState?: EmotionalState;
  executionRating?: number; // 1-5
  notes?: string;
  postMortem?: string;
  
  // Screenshots
  chartBeforeUrl?: string;
  chartAfterUrl?: string;
}

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  type: 'Prop Firm' | 'Live' | 'Demo' | 'Challenge';
  currency: string;
  initialBalance: number;
  currentBalance: number;
  isDefault: boolean;
  createdAt: string;
  mt5Login?: string;
  mt5Server?: string;
  lastSynced?: string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  timeframe: string;
  assetClass: string;
  rules: string[];
  winRate?: number;
  totalTrades?: number;
  netPnl?: number;
  color?: string;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL';

export interface AccountTransaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO date e.g. "2026-10-14"
  notes?: string;
  createdAt: string;
}

export interface HundredTradesChallenge {
  id: string;
  name: string;
  startDate: string; // ISO date string "YYYY-MM-DD"
  targetTrades: number; // 100
  targetDays: number; // 100
  accountId: string; // 'all' or specific account id
  startingBalance?: number;
  notes?: string;
  createdAt: string; // ISO string
  status: 'ACTIVE' | 'COMPLETED';
}
