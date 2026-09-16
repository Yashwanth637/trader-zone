import { Trade } from '../types/trade';
import { DailyJournalEntry } from '../types/journal';
import { formatCurrency } from './calculations';

export interface ProgressRuleConfig {
  startTime: string; // e.g. "09:30"
  maxRiskUsd: number; // e.g. 100
  maxDailyLossUsd: number; // e.g. 500
}

export const DEFAULT_PROGRESS_CONFIG: ProgressRuleConfig = {
  startTime: '09:30',
  maxRiskUsd: 100,
  maxDailyLossUsd: 500,
};

export interface EvaluatedRule {
  id: string;
  name: string;
  statusLabel: string; // e.g. "Completed / $500", "Not yet / 09:30"
  isPassed: boolean;
  periodPassedCount: number;
  periodTotalCount: number;
  ratioString: string; // e.g. "7 / 13"
}

export interface DayRulesAudit {
  date: string;
  rules: EvaluatedRule[];
  rulesPassed: number;
  totalRules: number;
  complianceScore: number; // 0 - 100
}

export interface ProgressTrackerData {
  selectedDayAudit: DayRulesAudit;
  currentStreak: number;
  currentPeriodScore: number;
  todayStats: {
    complianceScore: number;
    rulesPassed: number;
    totalRules: number;
    currentStreak: number;
  };
  activeDates: string[];
}

/**
 * Normalizes date to YYYY-MM-DD
 */
export function getTradeDate(trade: Trade): string {
  const d = trade.closeTime || trade.openTime || '';
  return d.split('T')[0];
}

/**
 * Extracts local HH:mm string from an ISO timestamp
 */
function getLocalTimeString(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

/**
 * Compares two HH:mm strings: returns true if timeA <= timeB
 */
function isTimeBeforeOrEqual(timeA: string, timeB: string): boolean {
  const [hA, mA] = timeA.split(':').map(Number);
  const [hB, mB] = timeB.split(':').map(Number);
  return (hA * 60 + mA) <= (hB * 60 + mB);
}

/**
 * Evaluates the 5 automated rules for a single date
 */
export function evaluateSingleDayRules(
  dateStr: string,
  trades: Trade[],
  journalEntry?: DailyJournalEntry,
  config: ProgressRuleConfig = DEFAULT_PROGRESS_CONFIG
): {
  rules: Array<{ id: string; name: string; statusLabel: string; isPassed: boolean }>;
  rulesPassed: number;
  totalRules: number;
  complianceScore: number;
} {
  const dayTrades = trades.filter(t => getTradeDate(t) === dateStr);
  const manualOverrides = journalEntry?.rulesFollowed || {};

  const formattedRisk = formatCurrency(config.maxRiskUsd);
  const formattedLoss = formatCurrency(config.maxDailyLossUsd);

  // 1. Start trading by 09:30
  let r1Passed = false;
  let r1Status = `Not yet / ${config.startTime}`;
  if (manualOverrides['rule_start_time'] !== undefined) {
    r1Passed = manualOverrides['rule_start_time'];
    r1Status = r1Passed ? `Completed / ${config.startTime}` : `Not yet / ${config.startTime}`;
  } else if (dayTrades.length > 0) {
    const tradesWithOpen = dayTrades.filter(t => !!t.openTime);
    if (tradesWithOpen.length > 0) {
      const earliest = tradesWithOpen.reduce((min, cur) =>
        new Date(cur.openTime).getTime() < new Date(min.openTime).getTime() ? cur : min
      );
      const openTimeStr = getLocalTimeString(earliest.openTime);
      if (openTimeStr && isTimeBeforeOrEqual(openTimeStr, config.startTime)) {
        r1Passed = true;
        r1Status = `Completed / ${config.startTime}`;
      } else {
        r1Passed = false;
        r1Status = `Not yet / ${config.startTime}`;
      }
    }
  }

  // 2. Set stop loss on all trades
  let r2Passed = false;
  let r2Status = 'Not yet / 100%';
  if (manualOverrides['rule_stop_loss'] !== undefined) {
    r2Passed = manualOverrides['rule_stop_loss'];
    r2Status = r2Passed ? 'Completed / 100%' : 'Not yet / 100%';
  } else if (dayTrades.length > 0) {
    const allHaveSl = dayTrades.every(t => t.stopLoss && t.stopLoss > 0);
    if (allHaveSl) {
      r2Passed = true;
      r2Status = 'Completed / 100%';
    } else {
      r2Passed = false;
      r2Status = 'Not yet / 100%';
    }
  }

  // 3. Max risk per trade
  let r3Passed = false;
  let r3Status = `Not yet / ${formattedRisk}`;
  if (manualOverrides['rule_max_risk'] !== undefined) {
    r3Passed = manualOverrides['rule_max_risk'];
    r3Status = r3Passed ? `Completed / ${formattedRisk}` : `Not yet / ${formattedRisk}`;
  } else if (dayTrades.length > 0) {
    const allWithinRisk = dayTrades.every(t => {
      if (t.plannedRiskUsd && t.plannedRiskUsd > 0) {
        return t.plannedRiskUsd <= config.maxRiskUsd;
      }
      if (t.netPnl < 0) {
        return Math.abs(t.netPnl) <= config.maxRiskUsd * 1.05; // 5% tolerance
      }
      return true;
    });

    if (allWithinRisk) {
      r3Passed = true;
      r3Status = `Completed / ${formattedRisk}`;
    } else {
      r3Passed = false;
      r3Status = `Not yet / ${formattedRisk}`;
    }
  }

  // 4. Max daily loss limit
  let r4Passed = true; // Default compliant if under max loss limit
  let r4Status = `Completed / ${formattedLoss}`;
  if (manualOverrides['rule_daily_loss'] !== undefined) {
    r4Passed = manualOverrides['rule_daily_loss'];
    r4Status = r4Passed ? `Completed / ${formattedLoss}` : `Not yet / ${formattedLoss}`;
  } else {
    const dayNetPnl = dayTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    // If loss exceeds limit (e.g. -600 < -500), breached
    if (dayNetPnl < -config.maxDailyLossUsd) {
      r4Passed = false;
      r4Status = `Not yet / ${formattedLoss}`;
    } else {
      r4Passed = true;
      r4Status = `Completed / ${formattedLoss}`;
    }
  }

  // 5. Journal every trade
  let r5Passed = false;
  let r5Status = 'Not yet / 100%';
  if (manualOverrides['rule_journal_trade'] !== undefined) {
    r5Passed = manualOverrides['rule_journal_trade'];
    r5Status = r5Passed ? 'Completed / 100%' : 'Not yet / 100%';
  } else {
    const hasReflection = !!journalEntry?.reflectionNotes?.trim();
    const allTradesNote = dayTrades.length > 0 && dayTrades.every(t => !!t.notes?.trim());
    if (hasReflection || allTradesNote) {
      r5Passed = true;
      r5Status = 'Completed / 100%';
    } else {
      r5Passed = false;
      r5Status = 'Not yet / 100%';
    }
  }

  const rules = [
    { id: 'rule_start_time', name: `Start trading by ${config.startTime}`, statusLabel: r1Status, isPassed: r1Passed },
    { id: 'rule_stop_loss', name: 'Set stop loss on all trades', statusLabel: r2Status, isPassed: r2Passed },
    { id: 'rule_max_risk', name: 'Max risk per trade', statusLabel: r3Status, isPassed: r3Passed },
    { id: 'rule_daily_loss', name: 'Max daily loss limit', statusLabel: r4Status, isPassed: r4Passed },
    { id: 'rule_journal_trade', name: 'Journal every trade', statusLabel: r5Status, isPassed: r5Passed },
  ];

  const rulesPassed = rules.filter(r => r.isPassed).length;
  const complianceScore = Math.round((rulesPassed / rules.length) * 100);

  return {
    rules,
    rulesPassed,
    totalRules: rules.length,
    complianceScore,
  };
}

/**
 * Calculates complete Progress Tracker analytics including period scores and streaks
 */
export function calculateProgressTracker(
  selectedDate: string,
  trades: Trade[],
  journalEntries: DailyJournalEntry[],
  config: ProgressRuleConfig = DEFAULT_PROGRESS_CONFIG
): ProgressTrackerData {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Gather all unique trading/active dates in descending order
  const dateSet = new Set<string>();
  trades.forEach(t => {
    const d = getTradeDate(t);
    if (d) dateSet.add(d);
  });
  journalEntries.forEach(j => {
    if (j.date) dateSet.add(j.date);
  });
  dateSet.add(todayStr);
  if (selectedDate) dateSet.add(selectedDate);

  const sortedDatesDesc = Array.from(dateSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // 2. Determine evaluation period window (defaults to 13 active days like in the user's reference)
  const periodWindowSize = Math.max(13, Math.min(sortedDatesDesc.length, 30));
  const periodDates = sortedDatesDesc.slice(0, periodWindowSize);
  const totalPeriodDays = periodDates.length || 13;

  // 3. Pre-audit each day in the period to gather historical rule pass counts
  const rulePassCounts: Record<string, number> = {
    rule_start_time: 0,
    rule_stop_loss: 0,
    rule_max_risk: 0,
    rule_daily_loss: 0,
    rule_journal_trade: 0,
  };

  const dayAuditMap = new Map<string, ReturnType<typeof evaluateSingleDayRules>>();

  periodDates.forEach(d => {
    const entry = journalEntries.find(j => j.date === d);
    const audit = evaluateSingleDayRules(d, trades, entry, config);
    dayAuditMap.set(d, audit);

    audit.rules.forEach(r => {
      if (r.isPassed) {
        rulePassCounts[r.id] = (rulePassCounts[r.id] || 0) + 1;
      }
    });
  });

  // Calculate Current Period Score: (Total rules passed across period / (5 * totalPeriodDays)) * 100
  const totalPossibleChecks = totalPeriodDays * 5;
  const totalPassedChecks = Object.values(rulePassCounts).reduce((a, b) => a + b, 0);
  const currentPeriodScore = totalPossibleChecks > 0
    ? Math.round((totalPassedChecks / totalPossibleChecks) * 100)
    : 0;

  // 4. Calculate Current Streak (consecutive days compliant with at least 80% or all rules)
  let streak = 0;
  for (const d of sortedDatesDesc) {
    const entry = journalEntries.find(j => j.date === d);
    let audit = dayAuditMap.get(d);
    if (!audit) {
      audit = evaluateSingleDayRules(d, trades, entry, config);
    }
    // A streak day is compliant if score >= 80% (or all 5 passed)
    if (audit.complianceScore >= 80) {
      streak++;
    } else {
      // If today has not been traded yet, don't break streak if yesterday was compliant
      if (d === todayStr && streak === 0 && trades.filter(t => getTradeDate(t) === todayStr).length === 0) {
        continue;
      }
      break;
    }
  }

  // 5. Selected Day Audit with ratio string
  const selectedEntry = journalEntries.find(j => j.date === selectedDate);
  const selectedRawAudit = dayAuditMap.get(selectedDate) || evaluateSingleDayRules(selectedDate, trades, selectedEntry, config);

  const selectedRulesWithRatio: EvaluatedRule[] = selectedRawAudit.rules.map(r => ({
    ...r,
    periodPassedCount: rulePassCounts[r.id] || 0,
    periodTotalCount: totalPeriodDays,
    ratioString: `${rulePassCounts[r.id] || 0} / ${totalPeriodDays}`,
  }));

  // 6. Today's stats
  const todayEntry = journalEntries.find(j => j.date === todayStr);
  const todayAudit = dayAuditMap.get(todayStr) || evaluateSingleDayRules(todayStr, trades, todayEntry, config);

  return {
    selectedDayAudit: {
      date: selectedDate,
      rules: selectedRulesWithRatio,
      rulesPassed: selectedRawAudit.rulesPassed,
      totalRules: selectedRawAudit.totalRules,
      complianceScore: selectedRawAudit.complianceScore,
    },
    currentStreak: streak,
    currentPeriodScore,
    todayStats: {
      complianceScore: todayAudit.complianceScore,
      rulesPassed: todayAudit.rulesPassed,
      totalRules: todayAudit.totalRules,
      currentStreak: streak,
    },
    activeDates: sortedDatesDesc,
  };
}
