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
  updatedAt: string;
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
