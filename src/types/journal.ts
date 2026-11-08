import { EmotionalState } from './trade';

export interface DailyJournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  accountId: string;
  reflectionNotes: string;
  preMarketPlan?: string;
  mood: EmotionalState;
  rating: number; // 1-5
  rulesFollowed: Record<string, boolean>; // ruleId -> boolean
  marketConditions?: 'Trending' | 'Ranging' | 'Choppy' | 'High Volatility' | 'News Driven';
  
  // Daily Trading Diary
  dos?: string[];
  donts?: string[];
  
  updatedAt: string;
}

export interface WeeklySundayReviewData {
  weekKey: string; // e.g. "2026-W37"
  startDate: string; // Monday YYYY-MM-DD
  endDate: string; // Sunday YYYY-MM-DD
  days: {
    date: string;
    dayName: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
    tradeCount: number;
    pnl: number;
    dos: string[];
    donts: string[];
  }[];
  dontsMatrix: {
    item: string;
    daysActive: boolean[]; // [Mon, Tue, Wed, Thu, Fri]
    count: number;
    isCritical: boolean; // >= 2 times
  }[];
  dosMatrix: {
    item: string;
    daysActive: boolean[]; // [Mon, Tue, Wed, Thu, Fri]
    count: number;
    isCore: boolean; // >= 2 times
  }[];
  totalTrades: number;
  totalPnl: number;
  criticalLeakCount: number;
}

export interface TradingRule {
  id: string;
  name: string;
  description: string;
  category: 'Risk' | 'Execution' | 'Psychology' | 'Time';
  enabled: boolean;
  isAutomated?: boolean;
}

export interface DisciplineMilestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number; // 0-100
}
