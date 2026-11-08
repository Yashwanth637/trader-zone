import React, { useState } from 'react';
import { Trade } from '../../types/trade';
import { DailyJournalEntry, WeeklySundayReviewData } from '../../types/journal';
import { calculateWeeklyReviewData, formatDateKey } from '../../lib/diaryAnalytics';
import { formatCurrency, formatSignedPnl } from '../../lib/calculations';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Award,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface SundayReviewSectionProps {
  trades: Trade[];
  journalEntries: DailyJournalEntry[];
  activeAccountId: string;
  onOpenDayDiary: (dateStr: string) => void;
}

export const SundayReviewSection: React.FC<SundayReviewSectionProps> = ({
  trades,
  journalEntries,
  activeAccountId,
  onOpenDayDiary
}) => {
  // Reference date for currently viewed week
  const [currentWeekRef, setCurrentWeekRef] = useState<Date>(() => new Date());

  const prevWeek = () => {
    setCurrentWeekRef(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const nextWeek = () => {
    setCurrentWeekRef(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const jumpToThisWeek = () => {
    setCurrentWeekRef(new Date());
  };

  const reviewData: WeeklySundayReviewData = calculateWeeklyReviewData(
    currentWeekRef,
    trades,
    journalEntries,
    activeAccountId
  );

  const startFormatted = new Date(reviewData.startDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const endFormatted = new Date(reviewData.endDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const criticalDonts = reviewData.dontsMatrix.filter(d => d.isCritical);

  return (
    <div className="space-y-6">
      {/* Top Banner: Weekend Review Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Weekend Review • Saturday & Sunday
            </span>
          </div>
          <h2 className="text-xl font-black text-foreground mt-1 flex items-center gap-2">
            <span>Weekly Habit & Mistake Synthesis</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Review your 5 trading days (Mon–Fri). Any Don't repeated ≥ 2 times represents your primary profit leak.
          </p>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={jumpToThisWeek}
            className="px-3 py-1.5 rounded-xl bg-surface border border-border/40 text-xs font-bold text-muted hover:text-foreground hover:border-primary/40 transition-all"
          >
            Current Week
          </button>
          <div className="flex items-center gap-1 bg-surface border border-border/40 p-1 rounded-xl shadow-sm">
            <button
              onClick={prevWeek}
              className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-foreground px-2.5 whitespace-nowrap">
              {startFormatted} – {endFormatted}
            </span>
            <button
              onClick={nextWeek}
              className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5-Day Monday-to-Friday Cards Row */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            5 Trading Days (Mon – Fri)
          </span>
          <span className="text-xs font-mono text-muted">
            Total Weekly P&L:{' '}
            <span className={`font-bold ${reviewData.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatSignedPnl(reviewData.totalPnl)}
            </span>
          </span>
        </div>

        {/* 5 Cards - Clean coordinate layout without mini-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {reviewData.days.slice(0, 5).map(day => {
            const isProfit = day.pnl > 0.01;
            const isLoss = day.pnl < -0.01;

            return (
              <div
                key={day.date}
                onClick={() => onOpenDayDiary(day.date)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between h-28 ${
                  isProfit
                    ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50'
                    : isLoss
                    ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 hover:border-rose-500/50'
                    : 'bg-surface border-border/30 dark:border-white/[0.07] hover:border-border-glow'
                }`}
              >
                {/* Top: Day and Date coordinates */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">
                    {day.dayName}
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    {day.date.slice(5)}
                  </span>
                </div>

                {/* Middle: Daily P&L and Trade count coordinates */}
                <div className="my-auto text-left">
                  <div className={`text-sm font-black font-mono ${
                    isProfit ? 'text-emerald-600 dark:text-emerald-400' : isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                  }`}>
                    {day.tradeCount > 0 ? formatCurrency(day.pnl) : '$0.00'}
                  </div>
                  <div className="text-[10px] text-muted font-mono mt-0.5">
                    {day.tradeCount} trade{day.tradeCount === 1 ? '' : 's'}
                  </div>
                </div>

                {/* Bottom: Grouped together side-by-side like before, without any mini-card box */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{day.dos.length}</span>
                  </span>
                  <span className="text-muted/40">/</span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                    <XCircle className="w-3 h-3" />
                    <span>{day.donts.length}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Leaks Highlight Box - Theme adaptive for light & dark mode */}
      {criticalDonts.length > 0 ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Critical Profit Leaks (Repeated ≥ 2 Times)
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold">
                  {criticalDonts.length} detected
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-rose-200/90 mt-0.5">
                These repeated mistakes are leaking your capital. Eliminating them is your #1 priority for next week.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {criticalDonts.map(c => (
              <span
                key={c.item}
                className="px-3 py-1 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5"
              >
                <span>{c.item}</span>
                <span className="font-mono text-rose-950 dark:text-rose-100 font-black">×{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Flawless Discipline This Week
            </div>
            <p className="text-xs text-slate-700 dark:text-emerald-200/80">
              No single mistake occurred 2 or more times this week! Your risk management was solid.
            </p>
          </div>
        </div>
      )}

      {/* Main Two Matrices: Don'ts Frequency & Do's Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DON'TS THIS WEEK MATRIX */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07] space-y-4 shadow-sm">
          {/* Header with matching padding and fixed grid for perfect vertical alignment */}
          <div className="flex items-center justify-between pb-2 border-b border-border/30 dark:border-white/[0.06] px-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="text-sm font-black text-foreground">
                Don'ts this week
              </h3>
            </div>

            {/* M T W T F Columns Header - Fixed 5-column grid matching circle row */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="grid grid-cols-5 w-32 text-center text-xs font-mono font-bold text-muted">
                <span className="flex items-center justify-center">M</span>
                <span className="flex items-center justify-center">T</span>
                <span className="flex items-center justify-center">W</span>
                <span className="flex items-center justify-center">T</span>
                <span className="flex items-center justify-center">F</span>
              </div>
              <span className="w-7 text-right font-mono font-bold text-xs text-muted">Qty</span>
            </div>
          </div>

          {/* Matrix Rows */}
          <div className="space-y-2">
            {reviewData.dontsMatrix.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border/40 text-center text-xs text-muted">
                No mistakes recorded for this week.
              </div>
            ) : (
              reviewData.dontsMatrix.map(row => (
                <div
                  key={row.item}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    row.isCritical
                      ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30'
                      : 'bg-surface border-border/30 dark:border-white/[0.06] hover:border-border-glow'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-foreground truncate">
                      {row.item}
                    </span>
                    {row.isCritical && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold uppercase tracking-wider flex-shrink-0 font-mono">
                        ≥ 2x Leak
                      </span>
                    )}
                  </div>

                  {/* 5 Day Dots + Counter in identical grid alignment */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="grid grid-cols-5 w-32">
                      {row.daysActive.map((active, dayIdx) => (
                        <div key={dayIdx} className="flex items-center justify-center">
                          <span
                            title={active ? `Occurred on ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx]}` : 'Clean'}
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                              active
                                ? 'bg-rose-500 shadow-sm shadow-rose-500/40 ring-2 ring-rose-500/20'
                                : 'bg-black/5 dark:bg-white/10 border border-slate-300 dark:border-white/15'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <span className={`text-xs font-mono font-black w-7 text-right ${
                      row.isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-muted'
                    }`}>
                      ×{row.count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DO'S THIS WEEK MATRIX */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07] space-y-4 shadow-sm">
          {/* Header with matching padding and fixed grid */}
          <div className="flex items-center justify-between pb-2 border-b border-border/30 dark:border-white/[0.06] px-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-black text-foreground">
                Do's this week
              </h3>
            </div>

            {/* M T W T F Columns Header */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="grid grid-cols-5 w-32 text-center text-xs font-mono font-bold text-muted">
                <span className="flex items-center justify-center">M</span>
                <span className="flex items-center justify-center">T</span>
                <span className="flex items-center justify-center">W</span>
                <span className="flex items-center justify-center">T</span>
                <span className="flex items-center justify-center">F</span>
              </div>
              <span className="w-7 text-right font-mono font-bold text-xs text-muted">Qty</span>
            </div>
          </div>

          {/* Matrix Rows */}
          <div className="space-y-2">
            {reviewData.dosMatrix.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border/40 text-center text-xs text-muted">
                No winning habits logged for this week yet.
              </div>
            ) : (
              reviewData.dosMatrix.map(row => (
                <div
                  key={row.item}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    row.isCore
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30'
                      : 'bg-surface border-border/30 dark:border-white/[0.06] hover:border-border-glow'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-foreground truncate">
                      {row.item}
                    </span>
                    {row.isCore && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold uppercase tracking-wider flex-shrink-0 font-mono">
                        Winning Habit
                      </span>
                    )}
                  </div>

                  {/* 5 Day Dots + Counter in identical grid alignment */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="grid grid-cols-5 w-32">
                      {row.daysActive.map((active, dayIdx) => (
                        <div key={dayIdx} className="flex items-center justify-center">
                          <span
                            title={active ? `Executed on ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx]}` : 'Not logged'}
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                              active
                                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40 ring-2 ring-emerald-500/20'
                                : 'bg-black/5 dark:bg-white/10 border border-slate-300 dark:border-white/15'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <span className={`text-xs font-mono font-black w-7 text-right ${
                      row.isCore ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'
                    }`}>
                      ×{row.count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
