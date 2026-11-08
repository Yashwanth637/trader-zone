import { Trade } from '../types/trade';
import { DailyJournalEntry, WeeklySundayReviewData } from '../types/journal';

export const DEFAULT_PRESET_DOS = [
  'Waited for confirmation',
  'Followed my stop loss',
  'Booked profit at target',
  'Traded only my setup',
  'Cut loss quickly',
  'Maintained proper position sizing',
  'Checked higher timeframe bias',
  'Remained calm and patient'
];

export const DEFAULT_PRESET_DONTS = [
  'Moved my stop loss',
  'Took a revenge trade',
  'Overtraded',
  'Traded without a setup',
  'Exited too early (FOMO)',
  'Oversized position / Overleveraged',
  'Traded ahead of high-impact news',
  'Chased a missed entry',
  'Held through invalidation'
];

export const RULE_INVERSIONS: Record<string, string> = {
  'Moved my stop loss': 'Never move stop loss against the position; accept the risk.',
  'Took a revenge trade': 'Zero revenge trading; take a mandatory 1-hour break after any loss.',
  'Overtraded': 'Strict daily limit of max 2-3 high-probability setups.',
  'Traded without a setup': 'Only pull the trigger when 100% of setup checklist is met.',
  'Exited too early (FOMO)': 'Trust target geometry and let winning trades run to TP.',
  'Oversized position / Overleveraged': 'Risk strictly 1% or less per trade without exception.',
  'Traded ahead of high-impact news': 'Stay flat 15 minutes before and after high-impact red folder events.',
  'Chased a missed entry': 'If an entry is missed, wait for the next pullback or move on.',
  'Held through invalidation': 'Cut invalid trade setups instantly at market.'
};

/**
 * Returns Monday Date for any given reference Date.
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Formats a Date object to YYYY-MM-DD.
 */
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns 7 days [Mon...Sun] for the week containing referenceDate.
 */
export function getWeekDays(referenceDate: Date = new Date()): Date[] {
  const monday = getMondayOfWeek(referenceDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

/**
 * Compiles 5-day Monday-Friday Diary & Sunday Review data for any given week.
 */
export function calculateWeeklyReviewData(
  referenceDate: Date,
  trades: Trade[],
  journalEntries: DailyJournalEntry[],
  activeAccountId: string = 'all'
): WeeklySundayReviewData {
  const weekDays = getWeekDays(referenceDate);
  const monday = weekDays[0];
  const sunday = weekDays[6];

  const startDate = formatDateKey(monday);
  const endDate = formatDateKey(sunday);
  const weekKey = `${monday.getFullYear()}-W${getWeekNumber(monday)}`;

  // Filter trades for this account
  const accountTrades = trades.filter(t => 
    t.status === 'CLOSED' && (activeAccountId === 'all' || t.accountId === activeAccountId)
  );

  const dayNames: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = [
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  ];

  let totalTrades = 0;
  let totalPnl = 0;

  const daysData = weekDays.map((d, index) => {
    const dateStr = formatDateKey(d);
    const dayTrades = accountTrades.filter(t => {
      const tradeDate = (t.closeTime || t.openTime).split('T')[0];
      return tradeDate === dateStr;
    });

    const dayPnl = dayTrades.reduce((sum, t) => sum + (Number(t.netPnl) || 0), 0);
    totalTrades += dayTrades.length;
    totalPnl += dayPnl;

    const entry = journalEntries.find(j => 
      j.date === dateStr && (activeAccountId === 'all' || j.accountId === activeAccountId)
    );

    return {
      date: dateStr,
      dayName: dayNames[index],
      tradeCount: dayTrades.length,
      pnl: dayPnl,
      dos: entry?.dos || [],
      donts: entry?.donts || []
    };
  });

  // Calculate Don'ts Matrix for Monday-to-Friday (indices 0 to 4)
  const allWeekDonts = new Set<string>();
  for (let i = 0; i < 5; i++) {
    daysData[i].donts.forEach(dont => allWeekDonts.add(dont.trim()));
  }

  const dontsMatrix = Array.from(allWeekDonts).map(item => {
    // Array of 5 booleans for Mon, Tue, Wed, Thu, Fri
    const daysActive = [0, 1, 2, 3, 4].map(idx => daysData[idx].donts.includes(item));
    const count = daysActive.filter(Boolean).length;
    return {
      item,
      daysActive,
      count,
      isCritical: count >= 2 // Highlighted in video if repeated >= 2 times
    };
  }).sort((a, b) => b.count - a.count || a.item.localeCompare(b.item));

  // Calculate Do's Matrix for Monday-to-Friday
  const allWeekDos = new Set<string>();
  for (let i = 0; i < 5; i++) {
    daysData[i].dos.forEach(doItem => allWeekDos.add(doItem.trim()));
  }

  const dosMatrix = Array.from(allWeekDos).map(item => {
    const daysActive = [0, 1, 2, 3, 4].map(idx => daysData[idx].dos.includes(item));
    const count = daysActive.filter(Boolean).length;
    return {
      item,
      daysActive,
      count,
      isCore: count >= 2 // Winning habit executed >= 2 times
    };
  }).sort((a, b) => b.count - a.count || a.item.localeCompare(b.item));

  const criticalLeakCount = dontsMatrix.filter(d => d.isCritical).length;

  return {
    weekKey,
    startDate,
    endDate,
    days: daysData,
    dontsMatrix,
    dosMatrix,
    totalTrades,
    totalPnl,
    criticalLeakCount
  };
}

/**
 * Calculates ISO week number.
 */
function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Aggregates all journal entries for a month and produces the Top 4 Golden Rules ("Sticky Note / Tattoo")
 * for the upcoming month, solving the root cause leaks.
 */
export function getMonthlyTopFocusRules(
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
  journalEntries: DailyJournalEntry[],
  activeAccountId: string = 'all'
): { rank: number; leak: string; count: number; rule: string }[] {
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  const monthEntries = journalEntries.filter(j => 
    j.date.startsWith(monthPrefix) && (activeAccountId === 'all' || j.accountId === activeAccountId)
  );

  const leakCounts: Record<string, number> = {};
  monthEntries.forEach(entry => {
    (entry.donts || []).forEach(dont => {
      const clean = dont.trim();
      if (!clean) return;
      leakCounts[clean] = (leakCounts[clean] || 0) + 1;
    });
  });

  const sortedLeaks = Object.entries(leakCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Fallback defaults if fewer than 4 mistakes were logged
  const fallbackDefaults = [
    'Moving my stop loss',
    'Revenge trading',
    'Overtrading',
    'Trading without a setup'
  ];

  const results: { rank: number; leak: string; count: number; rule: string }[] = [];

  sortedLeaks.forEach(([leak, count], idx) => {
    const rule = RULE_INVERSIONS[leak] || `Eliminate ${leak}: follow strict execution rules.`;
    results.push({
      rank: idx + 1,
      leak,
      count,
      rule
    });
  });

  // Fill up to 4 if user had fewer recorded leaks
  let fallbackIdx = 0;
  while (results.length < 4 && fallbackIdx < fallbackDefaults.length) {
    const defaultLeak = fallbackDefaults[fallbackIdx];
    if (!results.some(r => r.leak.toLowerCase() === defaultLeak.toLowerCase())) {
      const rule = RULE_INVERSIONS[defaultLeak] || `Eliminate ${defaultLeak} completely.`;
      results.push({
        rank: results.length + 1,
        leak: defaultLeak,
        count: 0,
        rule
      });
    }
    fallbackIdx++;
  }

  return results;
}
