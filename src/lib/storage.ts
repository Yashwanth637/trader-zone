import { Trade, TradingAccount, TradingStrategy } from '../types/trade';
import { DailyJournalEntry, TradingRule } from '../types/journal';
import { ChartVisionAnalysis, AICoachMessage } from '../types/ai';
import { UserProfile, RiskLimits } from '../types/settings';
import {
  initialAccounts,
  initialStrategies,
  initialRules,
  initialTrades,
  initialJournalEntries,
  initialChartVision,
  initialAICoachMessages,
  initialRiskLimits,
  initialProfile
} from './sampleData';

const KEYS = {
  TRADES: 'tz_trades_v1',
  ACCOUNTS: 'tz_accounts_v1',
  ACTIVE_ACCOUNT: 'tz_active_account_v1',
  STRATEGIES: 'tz_strategies_v1',
  RULES: 'tz_rules_v1',
  JOURNAL: 'tz_journal_v1',
  VISION: 'tz_vision_v1',
  COACH: 'tz_coach_v1',
  PROFILE: 'tz_profile_v1',
  RISK_LIMITS: 'tz_risk_limits_v1'
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    return JSON.parse(val);
  } catch (e) {
    console.error(`Failed to load ${key} from localStorage:`, e);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
  }
}

export const Storage = {
  getTrades(): Trade[] {
    return getItem<Trade[]>(KEYS.TRADES, initialTrades);
  },
  saveTrades(trades: Trade[]): void {
    setItem(KEYS.TRADES, trades);
  },

  getAccounts(): TradingAccount[] {
    return getItem<TradingAccount[]>(KEYS.ACCOUNTS, initialAccounts);
  },
  saveAccounts(accounts: TradingAccount[]): void {
    setItem(KEYS.ACCOUNTS, accounts);
  },

  getActiveAccountId(): string {
    return getItem<string>(KEYS.ACTIVE_ACCOUNT, 'acc-1');
  },
  saveActiveAccountId(id: string): void {
    setItem(KEYS.ACTIVE_ACCOUNT, id);
  },

  getStrategies(): TradingStrategy[] {
    return getItem<TradingStrategy[]>(KEYS.STRATEGIES, initialStrategies);
  },
  saveStrategies(strategies: TradingStrategy[]): void {
    setItem(KEYS.STRATEGIES, strategies);
  },

  getRules(): TradingRule[] {
    return getItem<TradingRule[]>(KEYS.RULES, initialRules);
  },
  saveRules(rules: TradingRule[]): void {
    setItem(KEYS.RULES, rules);
  },

  getJournalEntries(): DailyJournalEntry[] {
    return getItem<DailyJournalEntry[]>(KEYS.JOURNAL, initialJournalEntries);
  },
  saveJournalEntries(entries: DailyJournalEntry[]): void {
    setItem(KEYS.JOURNAL, entries);
  },

  getChartVision(): ChartVisionAnalysis[] {
    return getItem<ChartVisionAnalysis[]>(KEYS.VISION, initialChartVision);
  },
  saveChartVision(vision: ChartVisionAnalysis[]): void {
    setItem(KEYS.VISION, vision);
  },

  getCoachMessages(): AICoachMessage[] {
    return getItem<AICoachMessage[]>(KEYS.COACH, initialAICoachMessages);
  },
  saveCoachMessages(msgs: AICoachMessage[]): void {
    setItem(KEYS.COACH, msgs);
  },

  getProfile(): UserProfile {
    return getItem<UserProfile>(KEYS.PROFILE, initialProfile);
  },
  saveProfile(profile: UserProfile): void {
    setItem(KEYS.PROFILE, profile);
  },

  getRiskLimits(): RiskLimits {
    return getItem<RiskLimits>(KEYS.RISK_LIMITS, initialRiskLimits);
  },
  saveRiskLimits(limits: RiskLimits): void {
    setItem(KEYS.RISK_LIMITS, limits);
  },

  exportBackupJson(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      trades: this.getTrades(),
      accounts: this.getAccounts(),
      strategies: this.getStrategies(),
      rules: this.getRules(),
      journalEntries: this.getJournalEntries(),
      chartVision: this.getChartVision(),
      profile: this.getProfile(),
      riskLimits: this.getRiskLimits()
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.trades) this.saveTrades(data.trades);
      if (data.accounts) this.saveAccounts(data.accounts);
      if (data.strategies) this.saveStrategies(data.strategies);
      if (data.rules) this.saveRules(data.rules);
      if (data.journalEntries) this.saveJournalEntries(data.journalEntries);
      if (data.chartVision) this.saveChartVision(data.chartVision);
      if (data.profile) this.saveProfile(data.profile);
      if (data.riskLimits) this.saveRiskLimits(data.riskLimits);
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  },

  resetToDefault(): void {
    localStorage.clear();
    this.saveTrades(initialTrades);
    this.saveAccounts(initialAccounts);
    this.saveStrategies(initialStrategies);
    this.saveRules(initialRules);
    this.saveJournalEntries(initialJournalEntries);
    this.saveChartVision(initialChartVision);
    this.saveCoachMessages(initialAICoachMessages);
    this.saveProfile(initialProfile);
    this.saveRiskLimits(initialRiskLimits);
  }
};
