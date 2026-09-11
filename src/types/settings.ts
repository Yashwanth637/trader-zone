export interface RiskLimits {
  maxDailyLossUsd: number;
  maxDailyLossPercent: number;
  maxRiskPerTradePercent: number;
  maxOpenTrades: number;
  maxTradesPerDay: number;
  enforceRules: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';
  currency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';
  timezone: string;
  theme: 'dark' | 'midnight' | 'light';
  apiKey?: string; // OpenAI or Gemini API key for live AI
}
