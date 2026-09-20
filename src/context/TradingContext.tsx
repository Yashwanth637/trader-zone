import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Trade, TradingAccount, TradingStrategy } from '../types/trade';
import { DailyJournalEntry, TradingRule } from '../types/journal';
import { ChartVisionAnalysis, AICoachMessage, BehavioralAlert } from '../types/ai';
import { UserProfile, RiskLimits } from '../types/settings';
import { Storage } from '../lib/storage';
import { calculateSummaryStats, SummaryStats, calculatePnlFromPrices, setActiveCurrency, sortTradesDescending } from '../lib/calculations';
import { detectBehavioralPatterns } from '../lib/coachEngine';
import { useAuth } from './AuthContext';
import {
  fetchLiveExchangeRates,
  getStoredExchangeRates,
  getExchangeRateForCurrency,
  getCurrencySymbol,
  DEFAULT_EXCHANGE_RATES
} from '../lib/currencyService';

interface TradingContextType {
  trades: Trade[];
  accounts: TradingAccount[];
  activeAccountId: string;
  activeAccount: TradingAccount | undefined;
  strategies: TradingStrategy[];
  rules: TradingRule[];
  journalEntries: DailyJournalEntry[];
  chartVision: ChartVisionAnalysis[];
  coachMessages: AICoachMessage[];
  profile: UserProfile;
  riskLimits: RiskLimits;
  behavioralAlerts: BehavioralAlert[];
  
  // Filtered trades by active account
  accountTrades: Trade[];
  stats: SummaryStats;

  // Live Currency & Conversion
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  exchangeRates: Record<string, number>;
  isFetchingRates: boolean;
  ratesLastUpdated: string;
  ratesSource: string;
  refreshExchangeRates: (targetCurrency?: string) => Promise<void>;
  convertAmount: (usdAmount: number) => number;

  // Actions
  setActiveAccountId: (id: string) => void;
  addTrade: (trade: Omit<Trade, 'id'>) => Trade;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  closeTrade: (id: string, exitPrice: number, closeTime?: string) => void;
  importTrades: (newTrades: Trade[]) => void;
  cleanDuplicateTrades: () => number;
  
  addAccount: (account: Omit<TradingAccount, 'id' | 'createdAt'>) => TradingAccount;
  updateAccount: (id: string, updates: Partial<TradingAccount>) => void;
  deleteAccount: (id: string) => void;

  addStrategy: (strategy: Omit<TradingStrategy, 'id'>) => void;
  updateStrategy: (id: string, updates: Partial<TradingStrategy>) => void;
  deleteStrategy: (id: string) => void;

  toggleRule: (id: string) => void;
  updateRule: (id: string, updates: Partial<TradingRule>) => void;
  addRule: (rule: Omit<TradingRule, 'id'>) => void;

  saveJournalEntry: (entry: Omit<DailyJournalEntry, 'id' | 'updatedAt'>) => void;
  getJournalEntryForDate: (date: string) => DailyJournalEntry | undefined;

  addVisionAnalysis: (analysis: ChartVisionAnalysis) => void;
  deleteVisionAnalysis: (id: string) => void;

  addCoachMessage: (message: Omit<AICoachMessage, 'id' | 'timestamp'>) => void;

  updateProfile: (profile: Partial<UserProfile>) => void;
  updateRiskLimits: (limits: Partial<RiskLimits>) => void;

  exportData: () => string;
  importData: (jsonStr: string) => boolean;
  resetAllData: () => void;
}

export function normalizeTicket(ticket?: string): string {
  if (!ticket) return '';
  return ticket.trim().replace(/^DELTA-/i, '').replace(/^CSV-/i, '');
}

/**
 * Deduplicates and sanitizes trades:
 * 1. Guarantees every trade has a valid accountId belonging to an existing account.
 * 2. Merges duplicate trade entries matching normalized ticket or composite signature.
 */
export function deduplicateAndSanitizeTrades(
  tradeList: Trade[],
  availableAccounts: TradingAccount[]
): { sanitized: Trade[]; removedCount: number } {
  const accountIds = new Set(availableAccounts.map(a => a.id));
  const defaultAccId = availableAccounts.find(a => a.isDefault)?.id || availableAccounts[0]?.id || 'acc-1';

  const seenTicketsByAccount = new Map<string, Trade>();
  const seenSignaturesByAccount = new Map<string, Trade>();

  const result: Trade[] = [];
  let removedCount = 0;

  for (const rawTrade of tradeList) {
    const t: Trade = { ...rawTrade };
    // Ensure valid accountId
    if (!t.accountId || !accountIds.has(t.accountId)) {
      t.accountId = defaultAccId;
    }

    const normTicket = normalizeTicket(t.ticket);
    const dateMin = t.openTime ? new Date(t.openTime).toISOString().slice(0, 16) : '';
    const sym = (t.symbol || '').toUpperCase().trim();
    const dir = (t.direction || '').toUpperCase().trim();
    const lot = (Number(t.lotSize) || 0).toFixed(4);
    const entry = (Number(t.entryPrice) || 0).toFixed(4);

    const ticketKey = normTicket ? `${t.accountId}::${normTicket}` : null;
    const sigKey = `${t.accountId}::${sym}::${dir}::${lot}::${entry}::${dateMin}`;

    const existingMatch = (ticketKey && seenTicketsByAccount.get(ticketKey)) || seenSignaturesByAccount.get(sigKey);

    if (existingMatch) {
      removedCount++;
      // Merge richer info into existing trade
      if (!existingMatch.stopLoss && t.stopLoss) existingMatch.stopLoss = t.stopLoss;
      if (!existingMatch.takeProfit && t.takeProfit) existingMatch.takeProfit = t.takeProfit;
      if (!existingMatch.plannedRR && t.plannedRR) existingMatch.plannedRR = t.plannedRR;
      if (!existingMatch.realizedRR && t.realizedRR) existingMatch.realizedRR = t.realizedRR;
      if ((!existingMatch.notes || existingMatch.notes.length < (t.notes || '').length) && t.notes) existingMatch.notes = t.notes;
      if ((!existingMatch.setupTags || existingMatch.setupTags.length === 0) && t.setupTags?.length) existingMatch.setupTags = t.setupTags;
      if (!existingMatch.executionRating && t.executionRating) existingMatch.executionRating = t.executionRating;
      continue;
    }

    result.push(t);
    if (ticketKey) seenTicketsByAccount.set(ticketKey, t);
    seenSignaturesByAccount.set(sigKey, t);
  }

  return { sanitized: result, removedCount };
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>(() => Storage.getAccounts());
  const [trades, setTrades] = useState<Trade[]>(() => {
    const rawTrades = Storage.getTrades();
    const initialAccs = Storage.getAccounts();
    const { sanitized } = deduplicateAndSanitizeTrades(rawTrades, initialAccs);

    const normalized = sanitized.map(t => {
      let mod = { ...t };
      // If an imported trade currently has lotSize >= 10 (e.g. 50 from CSV), convert to true lot size (0.05)
      const isImported = t.id?.startsWith('imported') || t.notes?.toLowerCase().includes('delta') || t.ticket?.startsWith('CSV');
      if (isImported && t.lotSize >= 10) {
        mod.lotSize = parseFloat((t.lotSize / 1000).toFixed(5));
      }
      // Compute plannedRR if SL and TP exist
      if (mod.stopLoss && mod.takeProfit && !mod.plannedRR && mod.entryPrice) {
        const risk = Math.abs(mod.entryPrice - mod.stopLoss);
        const reward = Math.abs(mod.takeProfit - mod.entryPrice);
        if (risk > 0) {
          mod.plannedRR = parseFloat((reward / risk).toFixed(2));
        }
      }
      // Compute realizedRR if SL and exit exist
      if (mod.stopLoss && mod.exitPrice && mod.realizedRR === undefined && mod.entryPrice) {
        const risk = Math.abs(mod.entryPrice - mod.stopLoss);
        if (risk > 0) {
          const gain = mod.direction === 'BUY' ? (mod.exitPrice - mod.entryPrice) : (mod.entryPrice - mod.exitPrice);
          mod.realizedRR = parseFloat((gain / risk).toFixed(2));
        }
      }
      return mod;
    });
    const sorted = sortTradesDescending(normalized);
    // Persist sorted & normalized trades
    Storage.saveTrades(sorted);
    return sorted;
  });
  const [activeAccountId, setActiveAccountIdState] = useState<string>(() => Storage.getActiveAccountId());
  const [strategies, setStrategies] = useState<TradingStrategy[]>(() => Storage.getStrategies());
  const [rules, setRules] = useState<TradingRule[]>(() => Storage.getRules());
  const [journalEntries, setJournalEntries] = useState<DailyJournalEntry[]>(() => Storage.getJournalEntries());
  const [chartVision, setChartVision] = useState<ChartVisionAnalysis[]>(() => Storage.getChartVision());
  const [coachMessages, setCoachMessages] = useState<AICoachMessage[]>(() => Storage.getCoachMessages());
  const [profile, setProfile] = useState<UserProfile>(() => Storage.getProfile());
  const [riskLimits, setRiskLimits] = useState<RiskLimits>(() => Storage.getRiskLimits());

  // Live Currency & Exchange Rates State
  const currency = profile.currency || 'USD';
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(() => {
    return getStoredExchangeRates()?.rates || DEFAULT_EXCHANGE_RATES;
  });
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string>(() => {
    return getStoredExchangeRates()?.lastUpdated || 'Today';
  });
  const [ratesSource, setRatesSource] = useState<string>(() => {
    return getStoredExchangeRates()?.source || 'ExchangeRate-API (Live)';
  });
  const [isFetchingRates, setIsFetchingRates] = useState<boolean>(false);

  const exchangeRate = useMemo(() => {
    return getExchangeRateForCurrency(currency, exchangeRates);
  }, [currency, exchangeRates]);

  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(currency);
  }, [currency]);

  // Keep calculations module synchronized with active currency and exchange rate
  useEffect(() => {
    setActiveCurrency(currency, exchangeRate);
  }, [currency, exchangeRate]);

  const refreshExchangeRates = async (targetCurrency?: string) => {
    setIsFetchingRates(true);
    try {
      const data = await fetchLiveExchangeRates(true);
      setExchangeRates(data.rates);
      setRatesLastUpdated(data.lastUpdated);
      setRatesSource(data.source);
      const curr = targetCurrency || currency;
      const rate = getExchangeRateForCurrency(curr, data.rates);
      setActiveCurrency(curr, rate);
    } catch (err) {
      console.warn('Failed to refresh live exchange rates', err);
    } finally {
      setIsFetchingRates(false);
    }
  };

  // Initial check on mount: fetch if no fresh rates for today
  useEffect(() => {
    fetchLiveExchangeRates(false)
      .then(data => {
        setExchangeRates(data.rates);
        setRatesLastUpdated(data.lastUpdated);
        setRatesSource(data.source);
      })
      .catch(console.warn);
  }, []);

  // When user switches currency in profile, refresh today's rate if not already USD
  useEffect(() => {
    if (profile.currency && profile.currency !== 'USD') {
      refreshExchangeRates(profile.currency);
    }
  }, [profile.currency]);

  const convertAmount = (usdAmount: number): number => {
    return (Number(usdAmount) || 0) * exchangeRate;
  };

  // Reload user-specific data whenever user signs in, logs out, or switches accounts
  useEffect(() => {
    setTrades(sortTradesDescending(Storage.getTrades()));
    setAccounts(Storage.getAccounts());
    setActiveAccountIdState(Storage.getActiveAccountId());
    setStrategies(Storage.getStrategies());
    setRules(Storage.getRules());
    setJournalEntries(Storage.getJournalEntries());
    setChartVision(Storage.getChartVision());
    setCoachMessages(Storage.getCoachMessages());
    setProfile(Storage.getProfile());
    setRiskLimits(Storage.getRiskLimits());
  }, [user?.id]);

  // Auto-sync state to Storage
  useEffect(() => { Storage.saveTrades(trades); }, [trades]);
  useEffect(() => { Storage.saveAccounts(accounts); }, [accounts]);
  useEffect(() => { Storage.saveStrategies(strategies); }, [strategies]);
  useEffect(() => { Storage.saveRules(rules); }, [rules]);
  useEffect(() => { Storage.saveJournalEntries(journalEntries); }, [journalEntries]);
  useEffect(() => { Storage.saveChartVision(chartVision); }, [chartVision]);
  useEffect(() => { Storage.saveCoachMessages(coachMessages); }, [coachMessages]);
  useEffect(() => { Storage.saveProfile(profile); }, [profile]);
  useEffect(() => { Storage.saveRiskLimits(riskLimits); }, [riskLimits]);

  const setActiveAccountId = (id: string) => {
    setActiveAccountIdState(id);
    Storage.saveActiveAccountId(id);
  };

  const computedAccounts = useMemo(() => {
    return accounts.map(acc => {
      // Find all trades for this account
      const accTrades = trades.filter(t => t.accountId === acc.id);
      const netPnl = accTrades.reduce((sum, t) => sum + (Number(t.netPnl) || 0), 0);
      return {
        ...acc,
        currentBalance: Number(((acc.initialBalance || 0) + netPnl).toFixed(2))
      };
    });
  }, [accounts, trades]);

  const activeAccount = useMemo(() => {
    if (activeAccountId === 'all') return undefined;
    return computedAccounts.find(a => a.id === activeAccountId) || computedAccounts[0];
  }, [computedAccounts, activeAccountId]);

  const accountTrades = useMemo(() => {
    const raw = activeAccountId === 'all'
      ? trades
      : trades.filter(t => t.accountId === activeAccountId);
    return sortTradesDescending(raw);
  }, [trades, activeAccountId]);

  const stats = useMemo(() => {
    const startBalance = activeAccount
      ? activeAccount.initialBalance
      : computedAccounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
    return calculateSummaryStats(accountTrades, startBalance);
  }, [accountTrades, activeAccount, computedAccounts]);

  const behavioralAlerts = useMemo(() => {
    return detectBehavioralPatterns(accountTrades);
  }, [accountTrades]);

  // Actions
  const addTrade = (tradeData: Omit<Trade, 'id'>): Trade => {
    const targetAccountId = tradeData.accountId || (activeAccountId !== 'all' ? activeAccountId : (accounts[0]?.id || 'acc-1'));
    const newTrade: Trade = {
      ...tradeData,
      id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accountId: targetAccountId
    };
    setTrades(prev => {
      const { sanitized } = deduplicateAndSanitizeTrades([newTrade, ...prev], accounts);
      return sortTradesDescending(sanitized);
    });
    return newTrade;
  };

  const updateTrade = (id: string, updates: Partial<Trade>) => {
    setTrades(prev => sortTradesDescending(prev.map(t => (t.id === id ? { ...t, ...updates } : t))));
  };

  const deleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const closeTrade = (id: string, exitPrice: number, closeTime: string = new Date().toISOString()) => {
    setTrades(prev => sortTradesDescending(prev.map(t => {
      if (t.id !== id) return t;
      const { grossPnl, netPnl, pips } = calculatePnlFromPrices(
        t.symbol,
        t.direction,
        t.lotSize,
        t.entryPrice,
        exitPrice,
        t.commission,
        t.swap
      );
      return {
        ...t,
        status: 'CLOSED',
        exitPrice,
        closeTime,
        grossPnl,
        netPnl,
        pips,
        realizedRR: t.stopLoss ? parseFloat(((exitPrice - t.entryPrice) / (t.entryPrice - t.stopLoss)).toFixed(2)) : undefined
      };
    })));
  };

  const importTrades = (newTrades: Trade[]) => {
    setTrades(prev => {
      const combined = [...newTrades, ...prev];
      const { sanitized } = deduplicateAndSanitizeTrades(combined, accounts);
      return sortTradesDescending(sanitized);
    });
  };

  const cleanDuplicateTrades = (): number => {
    let removed = 0;
    setTrades(prev => {
      const { sanitized, removedCount } = deduplicateAndSanitizeTrades(prev, accounts);
      removed = removedCount;
      return sortTradesDescending(sanitized);
    });
    return removed;
  };

  const addAccount = (accData: Omit<TradingAccount, 'id' | 'createdAt'>): TradingAccount => {
    const newAcc: TradingAccount = {
      ...accData,
      id: `acc-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setAccounts(prev => [...prev, newAcc]);
    return newAcc;
  };

  const updateAccount = (id: string, updates: Partial<TradingAccount>) => {
    setAccounts(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
  };

  const deleteAccount = (id: string) => {
    if (accounts.length <= 1) return;
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (activeAccountId === id) {
      setActiveAccountId(accounts.find(a => a.id !== id)?.id || 'all');
    }
  };

  const addStrategy = (stratData: Omit<TradingStrategy, 'id'>) => {
    const newStrat: TradingStrategy = {
      ...stratData,
      id: `strat-${Date.now()}`
    };
    setStrategies(prev => [...prev, newStrat]);
  };

  const updateStrategy = (id: string, updates: Partial<TradingStrategy>) => {
    setStrategies(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteStrategy = (id: string) => {
    setStrategies(prev => prev.filter(s => s.id !== id));
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const updateRule = (id: string, updates: Partial<TradingRule>) => {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
  };

  const addRule = (ruleData: Omit<TradingRule, 'id'>) => {
    const newRule: TradingRule = {
      ...ruleData,
      id: `rule-${Date.now()}`
    };
    setRules(prev => [...prev, newRule]);
  };

  const saveJournalEntry = (entryData: Omit<DailyJournalEntry, 'id' | 'updatedAt'>) => {
    const existingIndex = journalEntries.findIndex(
      e => e.date === entryData.date && e.accountId === entryData.accountId
    );
    const updatedEntry: DailyJournalEntry = {
      ...entryData,
      id: existingIndex >= 0 ? journalEntries[existingIndex].id : `journal-${entryData.date}-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      setJournalEntries(prev => {
        const copy = [...prev];
        copy[existingIndex] = updatedEntry;
        return copy;
      });
    } else {
      setJournalEntries(prev => [updatedEntry, ...prev]);
    }
  };

  const getJournalEntryForDate = (date: string): DailyJournalEntry | undefined => {
    return journalEntries.find(
      e => e.date === date && (activeAccountId === 'all' || e.accountId === activeAccountId)
    );
  };

  const addVisionAnalysis = (analysis: ChartVisionAnalysis) => {
    setChartVision(prev => [analysis, ...prev]);
  };

  const deleteVisionAnalysis = (id: string) => {
    setChartVision(prev => prev.filter(v => v.id !== id));
  };

  const addCoachMessage = (msgData: Omit<AICoachMessage, 'id' | 'timestamp'>) => {
    const newMsg: AICoachMessage = {
      ...msgData,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setCoachMessages(prev => [...prev, newMsg]);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const updateRiskLimits = (updates: Partial<RiskLimits>) => {
    setRiskLimits(prev => ({ ...prev, ...updates }));
  };

  const exportData = () => {
    return Storage.exportBackupJson();
  };

  const importData = (jsonStr: string): boolean => {
    const ok = Storage.importBackupJson(jsonStr);
    if (ok) {
      setTrades(Storage.getTrades());
      setAccounts(Storage.getAccounts());
      setStrategies(Storage.getStrategies());
      setRules(Storage.getRules());
      setJournalEntries(Storage.getJournalEntries());
      setChartVision(Storage.getChartVision());
      setProfile(Storage.getProfile());
      setRiskLimits(Storage.getRiskLimits());
    }
    return ok;
  };

  const resetAllData = () => {
    Storage.resetToDefault();
    setTrades(Storage.getTrades());
    setAccounts(Storage.getAccounts());
    setStrategies(Storage.getStrategies());
    setRules(Storage.getRules());
    setJournalEntries(Storage.getJournalEntries());
    setChartVision(Storage.getChartVision());
    setCoachMessages(Storage.getCoachMessages());
    setProfile(Storage.getProfile());
    setRiskLimits(Storage.getRiskLimits());
  };

  return (
    <TradingContext.Provider
      value={{
        trades,
        accounts: computedAccounts,
        activeAccountId,
        activeAccount,
        strategies,
        rules,
        journalEntries,
        chartVision,
        coachMessages,
        profile,
        riskLimits,
        behavioralAlerts,
        accountTrades,
        stats,
        currency,
        currencySymbol,
        exchangeRate,
        exchangeRates,
        isFetchingRates,
        ratesLastUpdated,
        ratesSource,
        refreshExchangeRates,
        convertAmount,
        setActiveAccountId,
        addTrade,
        updateTrade,
        deleteTrade,
        closeTrade,
        importTrades,
        cleanDuplicateTrades,
        addAccount,
        updateAccount,
        deleteAccount,
        addStrategy,
        updateStrategy,
        deleteStrategy,
        toggleRule,
        updateRule,
        addRule,
        saveJournalEntry,
        getJournalEntryForDate,
        addVisionAnalysis,
        deleteVisionAnalysis,
        addCoachMessage,
        updateProfile,
        updateRiskLimits,
        exportData,
        importData,
        resetAllData
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error('useTrading must be used within TradingProvider');
  return context;
};
