import { Trade, TradingAccount, TradingStrategy } from '../types/trade';
import { DailyJournalEntry, TradingRule } from '../types/journal';
import { ChartVisionAnalysis, AICoachMessage } from '../types/ai';
import { UserProfile, RiskLimits } from '../types/settings';
import { User } from '../types/auth';
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

const CURRENT_USER_KEY = 'tz_current_active_user';

export function getActiveUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setActiveUser(user: User | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

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

function getUserKey(baseKey: string): string {
  const activeUser = getActiveUser();
  if (!activeUser || !activeUser.id) return baseKey; // Default/Guest
  return `${baseKey}_user_${activeUser.id}`;
}

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
  /**
   * Automatically migrate any unpartitioned/guest data to a new user account
   */
  migrateToUser(userId: string): void {
    const scopedTradeKey = `${KEYS.TRADES}_user_${userId}`;
    // If the user already has data, do not overwrite
    if (localStorage.getItem(scopedTradeKey)) return;

    // Check if unscoped data exists
    const rawTrades = localStorage.getItem(KEYS.TRADES);
    if (rawTrades) localStorage.setItem(scopedTradeKey, rawTrades);

    const rawAccs = localStorage.getItem(KEYS.ACCOUNTS);
    if (rawAccs) localStorage.setItem(`${KEYS.ACCOUNTS}_user_${userId}`, rawAccs);

    const rawActive = localStorage.getItem(KEYS.ACTIVE_ACCOUNT);
    if (rawActive) localStorage.setItem(`${KEYS.ACTIVE_ACCOUNT}_user_${userId}`, rawActive);

    const rawStrat = localStorage.getItem(KEYS.STRATEGIES);
    if (rawStrat) localStorage.setItem(`${KEYS.STRATEGIES}_user_${userId}`, rawStrat);

    const rawRules = localStorage.getItem(KEYS.RULES);
    if (rawRules) localStorage.setItem(`${KEYS.RULES}_user_${userId}`, rawRules);

    const rawJournal = localStorage.getItem(KEYS.JOURNAL);
    if (rawJournal) localStorage.setItem(`${KEYS.JOURNAL}_user_${userId}`, rawJournal);

    const rawProf = localStorage.getItem(KEYS.PROFILE);
    if (rawProf) localStorage.setItem(`${KEYS.PROFILE}_user_${userId}`, rawProf);

    const rawRisk = localStorage.getItem(KEYS.RISK_LIMITS);
    if (rawRisk) localStorage.setItem(`${KEYS.RISK_LIMITS}_user_${userId}`, rawRisk);
  },

  getTrades(): Trade[] {
    return getItem<Trade[]>(getUserKey(KEYS.TRADES), initialTrades);
  },
  saveTrades(trades: Trade[]): void {
    setItem(getUserKey(KEYS.TRADES), trades);
  },

  getAccounts(): TradingAccount[] {
    return getItem<TradingAccount[]>(getUserKey(KEYS.ACCOUNTS), initialAccounts);
  },
  saveAccounts(accounts: TradingAccount[]): void {
    setItem(getUserKey(KEYS.ACCOUNTS), accounts);
  },

  getActiveAccountId(): string {
    return getItem<string>(getUserKey(KEYS.ACTIVE_ACCOUNT), 'acc-1');
  },
  saveActiveAccountId(id: string): void {
    setItem(getUserKey(KEYS.ACTIVE_ACCOUNT), id);
  },

  getStrategies(): TradingStrategy[] {
    return getItem<TradingStrategy[]>(getUserKey(KEYS.STRATEGIES), initialStrategies);
  },
  saveStrategies(strategies: TradingStrategy[]): void {
    setItem(getUserKey(KEYS.STRATEGIES), strategies);
  },

  getRules(): TradingRule[] {
    return getItem<TradingRule[]>(getUserKey(KEYS.RULES), initialRules);
  },
  saveRules(rules: TradingRule[]): void {
    setItem(getUserKey(KEYS.RULES), rules);
  },

  getJournalEntries(): DailyJournalEntry[] {
    return getItem<DailyJournalEntry[]>(getUserKey(KEYS.JOURNAL), initialJournalEntries);
  },
  saveJournalEntries(entries: DailyJournalEntry[]): void {
    setItem(getUserKey(KEYS.JOURNAL), entries);
  },

  getChartVision(): ChartVisionAnalysis[] {
    return getItem<ChartVisionAnalysis[]>(getUserKey(KEYS.VISION), initialChartVision);
  },
  saveChartVision(vision: ChartVisionAnalysis[]): void {
    setItem(getUserKey(KEYS.VISION), vision);
  },

  getCoachMessages(): AICoachMessage[] {
    return getItem<AICoachMessage[]>(getUserKey(KEYS.COACH), initialAICoachMessages);
  },
  saveCoachMessages(msgs: AICoachMessage[]): void {
    setItem(getUserKey(KEYS.COACH), msgs);
  },

  getProfile(): UserProfile {
    return getItem<UserProfile>(getUserKey(KEYS.PROFILE), initialProfile);
  },
  saveProfile(profile: UserProfile): void {
    setItem(getUserKey(KEYS.PROFILE), profile);
  },

  getRiskLimits(): RiskLimits {
    return getItem<RiskLimits>(getUserKey(KEYS.RISK_LIMITS), initialRiskLimits);
  },
  saveRiskLimits(limits: RiskLimits): void {
    setItem(getUserKey(KEYS.RISK_LIMITS), limits);
  },

  exportBackupJson(): string {
    const backup = {
      version: '2.0',
      user: getActiveUser(),
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
    const activeKey = getUserKey(KEYS.TRADES);
    localStorage.removeItem(activeKey);
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
