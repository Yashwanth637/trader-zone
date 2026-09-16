import { Trade } from '../types/trade';

export interface DayExecutionTrade {
  id: string;
  openTimeFormatted: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  side: 'long' | 'short';
  quantity: number;
  netPnl: number;
  isWin: boolean;
}

export interface DayPerformanceCardData {
  dateKey: string; // YYYY-MM-DD
  dateTitle: string; // e.g. "Thu, Sep 3, 2026"
  netPnl: number;
  isProfitable: boolean;
  totalTrades: number;
  winRate: number;
  grossPnl: number;
  winnersCount: number;
  losersCount: number;
  volume: number;
  profitFactor: number;
  commissions: number;
  intradayProgression: { time: string; pnl: number }[];
  trades: DayExecutionTrade[];
}

export interface CalendarDayCell {
  dayNum: number;
  dateKey: string;
  hasTrades: boolean;
  status: 'win' | 'loss' | 'none';
  netPnl: number;
  isCurrentMonth: boolean;
}

/**
 * Calculates day performance data for all dates that have trades
 */
export function calculateDayViewData(trades: Trade[]): {
  daysMap: Record<string, DayPerformanceCardData>;
  allDateKeys: string[];
} {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const dayGroups: Record<string, Trade[]> = {};

  closed.forEach(t => {
    const rawDate = t.closeTime || t.openTime;
    const dateKey = rawDate.split('T')[0];
    if (!dayGroups[dateKey]) {
      dayGroups[dateKey] = [];
    }
    dayGroups[dateKey].push(t);
  });

  const daysMap: Record<string, DayPerformanceCardData> = {};

  Object.entries(dayGroups).forEach(([dateKey, dayTrades]) => {
    // Sort trades chronologically
    const sortedTrades = [...dayTrades].sort(
      (a, b) => new Date(a.openTime || a.closeTime).getTime() - new Date(b.openTime || b.closeTime).getTime()
    );

    let grossPnl = 0;
    let netPnl = 0;
    let volume = 0;
    let commissions = 0;
    let winnersCount = 0;
    let losersCount = 0;
    let grossWinSum = 0;
    let grossLossSum = 0;

    let runningPnl = 0;
    const intradayProgression: { time: string; pnl: number }[] = [];

    const executionTrades: DayExecutionTrade[] = sortedTrades.map(t => {
      const pnl = t.netPnl;
      netPnl += pnl;
      grossPnl += t.grossPnl || pnl;
      volume += t.lotSize || 0;
      commissions += (t.commission || 0) + (t.swap || 0);

      if (pnl > 0.01) {
        winnersCount++;
        grossWinSum += pnl;
      } else if (pnl < -0.01) {
        losersCount++;
        grossLossSum += Math.abs(pnl);
      }

      runningPnl += pnl;
      const d = new Date(t.openTime || t.closeTime);
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      intradayProgression.push({
        time: timeStr,
        pnl: parseFloat(runningPnl.toFixed(2))
      });

      return {
        id: t.id,
        openTimeFormatted: timeStr,
        symbol: t.symbol,
        direction: t.direction,
        side: t.direction === 'BUY' ? 'long' : 'short',
        quantity: t.lotSize || 1,
        netPnl: parseFloat(pnl.toFixed(2)),
        isWin: pnl >= 0
      };
    });

    const totalTrades = executionTrades.length;
    const winRate = totalTrades > 0 ? (winnersCount / totalTrades) * 100 : 0;
    const profitFactor = grossLossSum > 0 ? grossWinSum / grossLossSum : grossWinSum > 0 ? grossWinSum : 0;

    // Format date title e.g. "Thu, Sep 3, 2026"
    const dateObj = new Date(dateKey + 'T00:00:00');
    const dateTitle = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    daysMap[dateKey] = {
      dateKey,
      dateTitle,
      netPnl: parseFloat(netPnl.toFixed(2)),
      isProfitable: netPnl >= 0,
      totalTrades,
      winRate: parseFloat(winRate.toFixed(1)),
      grossPnl: parseFloat(grossPnl.toFixed(2)),
      winnersCount,
      losersCount,
      volume: parseFloat(volume.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      commissions: parseFloat(commissions.toFixed(2)),
      intradayProgression,
      trades: [...executionTrades].reverse()
    };
  });

  const allDateKeys = Object.keys(daysMap).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return { daysMap, allDateKeys };
}

/**
 * Generates calendar month cells (including padding for weekday alignment)
 */
export function generateMonthCalendar(
  year: number,
  month: number, // 0 = Jan, 8 = Sep, 11 = Dec
  daysMap: Record<string, DayPerformanceCardData>
): CalendarDayCell[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarDayCell[] = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateKey = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    cells.push({
      dayNum,
      dateKey,
      hasTrades: false,
      status: 'none',
      netPnl: 0,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayData = daysMap[dateKey];
    const hasTrades = !!dayData && dayData.totalTrades > 0;
    const status: 'win' | 'loss' | 'none' = hasTrades
      ? (dayData.netPnl >= 0 ? 'win' : 'loss')
      : 'none';

    cells.push({
      dayNum: day,
      dateKey,
      hasTrades,
      status,
      netPnl: dayData ? dayData.netPnl : 0,
      isCurrentMonth: true
    });
  }

  // Next month padding to complete standard 35 or 42 grid
  const remaining = 35 - cells.length;
  if (remaining > 0) {
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateKey = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      cells.push({
        dayNum: day,
        dateKey,
        hasTrades: false,
        status: 'none',
        netPnl: 0,
        isCurrentMonth: false
      });
    }
  }

  return cells;
}
