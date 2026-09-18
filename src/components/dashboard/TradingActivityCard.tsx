import React, { useRef, useEffect } from 'react';
import { TradingActivityStats } from '../../lib/scoreCalculations';
import { formatAdaptivePnl } from '../../lib/calculations';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface TradingActivityCardProps {
  activityData: TradingActivityStats;
}

export const TradingActivityCard: React.FC<TradingActivityCardProps> = ({ activityData }) => {
  const {
    totalTradesInYear,
    year,
    daysTraded,
    greenDays,
    redDays,
    dailyWinRate,
    currentStreak,
    longestStreak,
    totalPnl,
    avgPnlPerDay,
    bestDay,
    worstDay,
    monthlyDots
  } = activityData;

  const isPnlPositive = totalPnl >= 0;
  const isAvgPositive = avgPnlPerDay >= 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'short' });

  // Auto-scroll to current month or latest month with activity on mount
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector<HTMLElement>('[data-current-month="true"]');
      if (activeEl) {
        const container = scrollRef.current;
        const scrollTarget = activeEl.offsetLeft - (container.clientWidth / 2) + (activeEl.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' });
      } else {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }
    }
  }, [monthlyDots]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 260;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="premium-card p-6 flex flex-col justify-between h-full space-y-6">
      {/* Header with Title and Dot Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Trading Activity</h2>
          <p className="text-xs text-muted mt-0.5">{totalTradesInYear} trades in {year}</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-muted self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span>Loss</span>
            <div className="flex gap-0.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Profit</span>
            <div className="flex gap-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Activity Dot Matrix (Months with 3-Column Grids & Horizontal Scrolling) */}
      <div className="w-full space-y-2">
        {/* Timeline Header with Navigation Arrows */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Monthly Activity ({year})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="p-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 hover:dark:bg-white/[0.08] text-muted hover:text-foreground transition-all cursor-pointer"
              title="Scroll left"
              type="button"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 hover:dark:bg-white/[0.08] text-muted hover:text-foreground transition-all cursor-pointer"
              title="Scroll right"
              type="button"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Months Container */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scroll-smooth scrollbar-thin scrollbar-thumb-border/60 select-none border-b border-slate-200/80 dark:border-white/10"
        >
          {monthlyDots.map((m) => {
            const isCurrent = m.month === currentMonthName;
            return (
              <div
                key={m.month}
                data-current-month={isCurrent ? 'true' : 'false'}
                className={`flex-shrink-0 min-w-[82px] max-w-[94px] rounded-xl p-2 border transition-all flex flex-col items-center ${
                  isCurrent
                    ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 shadow-sm'
                    : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 hover:dark:border-white/20'
                }`}
              >
                {/* Month Name & Day Count Header */}
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className={`text-[11px] font-bold tracking-tight ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                    {m.month}
                  </span>
                  <span className="text-[10px] font-mono text-muted font-medium">
                    {m.days.length > 0 ? `${m.days.length}d` : '—'}
                  </span>
                </div>

                {/* 3-Column Dot Matrix */}
                <div className="w-full h-[105px] overflow-y-auto scrollbar-none flex flex-col justify-start">
                  {m.days.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-1 opacity-25">
                      <div className="grid grid-cols-3 gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-border" />
                        <span className="w-2.5 h-2.5 rounded-full bg-border" />
                        <span className="w-2.5 h-2.5 rounded-full bg-border" />
                      </div>
                      <span className="text-[9px] text-muted font-medium">No trades</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 justify-items-center">
                      {m.days.map((d, dIdx) => (
                        <span
                          key={dIdx}
                          title={`${d.date}: ${d.pnl >= 0 ? '+' : ''}${formatAdaptivePnl(d.pnl)} (${d.status.toUpperCase()})`}
                          className={`w-2.5 h-2.5 rounded-full transition-all hover:scale-130 cursor-pointer ${
                            d.status === 'win'
                              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40 hover:ring-2 hover:ring-emerald-400'
                              : 'bg-rose-500 shadow-sm shadow-rose-500/40 hover:ring-2 hover:ring-rose-400'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6-Item Metrics Grid */}
      <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center">
        <div>
          <div className="text-xl font-mono font-bold text-violet-400">
            {daysTraded}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Days Traded</div>
        </div>

        <div>
          <div className="text-xl font-mono font-bold text-emerald-500">
            {greenDays}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Green Days</div>
        </div>

        <div>
          <div className="text-xl font-mono font-bold text-rose-500">
            {redDays}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Red Days</div>
        </div>

        <div>
          <div className="text-xl font-mono font-bold text-violet-400">
            {currentStreak}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Current Streak</div>
        </div>

        <div>
          <div className="text-xl font-mono font-bold text-violet-400">
            {longestStreak}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Longest Streak</div>
        </div>

        <div>
          <div className={`text-xl font-mono font-bold ${isPnlPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPnlPositive && totalPnl > 0 ? `+${formatAdaptivePnl(totalPnl)}` : formatAdaptivePnl(totalPnl)}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5">Total P&L</div>
        </div>
      </div>

      {/* Daily Win Rate Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-foreground">Daily Win Rate</span>
          <span className={dailyWinRate >= 50 ? 'text-emerald-500 font-mono' : 'text-rose-500 font-mono'}>
            {dailyWinRate.toFixed(1)}%
          </span>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full h-3.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${Math.max(4, dailyWinRate)}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
          />
          <div
            style={{ width: `${Math.max(4, 100 - dailyWinRate)}%` }}
            className="h-full bg-rose-500/80 transition-all duration-500"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-0.5">
          <span>{greenDays}W</span>
          <span className="text-slate-500">50%</span>
          <span>{redDays}L</span>
        </div>
      </div>

      {/* Best Day & Worst Day Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Best Day Card */}
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
            BEST DAY
          </div>
          <div className="text-lg font-mono font-black text-emerald-500 mt-1">
            {bestDay ? `+${formatAdaptivePnl(bestDay.pnl)}` : formatAdaptivePnl(0)}
          </div>
          <div className="text-xs text-muted mt-1 font-medium">
            {bestDay ? `${bestDay.date} · ${bestDay.tradeCount} trades` : 'No wins yet'}
          </div>
        </div>

        {/* Worst Day Card */}
        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
            WORST DAY
          </div>
          <div className="text-lg font-mono font-black text-rose-500 mt-1">
            {worstDay ? formatAdaptivePnl(worstDay.pnl) : formatAdaptivePnl(0)}
          </div>
          <div className="text-xs text-muted mt-1 font-medium">
            {worstDay ? `${worstDay.date} · ${worstDay.tradeCount} trades` : 'No losses yet'}
          </div>
        </div>
      </div>

      {/* Footer: Avg P&L / Day */}
      <div className="text-center pt-2 text-xs text-muted">
        Avg P&L / Day:{' '}
        <span className={`font-mono font-bold text-sm ml-1 ${isAvgPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isAvgPositive && avgPnlPerDay > 0 ? `+${formatAdaptivePnl(avgPnlPerDay)}` : formatAdaptivePnl(avgPnlPerDay)}
        </span>
      </div>
    </div>
  );
};
