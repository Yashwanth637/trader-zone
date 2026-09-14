import React from 'react';
import { TradingActivityStats } from '../../lib/scoreCalculations';

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

      {/* Calendar Activity Dot Matrix (Months columns) */}
      <div className="w-full">
        <div className="grid grid-cols-6 gap-2 text-center text-xs font-semibold text-muted mb-2">
          {monthlyDots.map(m => (
            <div key={m.month}>{m.month}</div>
          ))}
        </div>

        {/* Dots columns container */}
        <div className="grid grid-cols-6 gap-2 h-20 items-end pb-2 border-b border-border/60">
          {monthlyDots.map((m, idx) => {
            // Stack dots vertically up to 8 max per column
            const displayDots = m.days.slice(0, 10);
            return (
              <div key={idx} className="flex flex-col items-center gap-1 justify-end h-full">
                {displayDots.length === 0 ? (
                  <span className="w-2 h-2 rounded-full bg-border/40 opacity-30" />
                ) : (
                  displayDots.map((d, dIdx) => (
                    <span
                      key={dIdx}
                      title={`${d.date}: ${d.pnl >= 0 ? '+' : ''}$${d.pnl.toLocaleString()}`}
                      className={`w-2.5 h-2.5 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                        d.status === 'win' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-rose-500 shadow-sm shadow-rose-500/30'
                      }`}
                    />
                  ))
                )}
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
            {isPnlPositive ? '+' : ''}${Math.round(totalPnl).toLocaleString()}
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
            {bestDay ? `+$${Math.round(bestDay.pnl).toLocaleString()}` : '$0'}
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
            {worstDay ? `-$${Math.abs(Math.round(worstDay.pnl)).toLocaleString()}` : '$0'}
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
          {isAvgPositive ? '+' : ''}${Math.round(avgPnlPerDay).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
