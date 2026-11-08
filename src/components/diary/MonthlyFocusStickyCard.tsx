import React, { useState } from 'react';
import { DailyJournalEntry } from '../../types/journal';
import { getMonthlyTopFocusRules } from '../../lib/diaryAnalytics';
import {
  Pin,
  TrendingUp,
  Copy,
  Check
} from 'lucide-react';

interface MonthlyFocusStickyCardProps {
  year: number;
  month: number; // 0-indexed
  journalEntries: DailyJournalEntry[];
  activeAccountId: string;
}

export const MonthlyFocusStickyCard: React.FC<MonthlyFocusStickyCardProps> = ({
  year,
  month,
  journalEntries,
  activeAccountId
}) => {
  const [copied, setCopied] = useState(false);

  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
  const rules = getMonthlyTopFocusRules(year, month, journalEntries, activeAccountId);

  const handleCopy = () => {
    const text = `🎯 MY 4 TRADING RULES FOR NEXT MONTH (${monthName} ${year}):\n` +
      rules.map(r => `${r.rank}. ${r.rule} (Root leak: ${r.leak}${r.count > 0 ? ` ×${r.count}` : ''})`).join('\n') +
      '\n\n"Fix these 4, grow steadily."';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-6 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07] relative overflow-hidden shadow-lg space-y-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Pin className="w-3 h-3" />
              <span>Monthly Focus • Next Month's 4 Rules</span>
            </span>
          </div>
          <h2 className="text-xl font-black text-foreground mt-1 flex items-center gap-2">
            <span>Root-Cause Fix: Your 4 Golden Rules</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Compiled from your 21 trading days across all 4 weeks of {monthName}. These are the 4 habits preventing steady capital growth.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border/40 hover:border-primary/50 text-xs font-bold text-foreground transition-all shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied to Clipboard</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-muted" />
              <span>Copy My 4 Rules</span>
            </>
          )}
        </button>
      </div>

      {/* The 4 Rules Sticky Desk Grid - Softened borders & no inner mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {rules.map(item => (
          <div
            key={item.rank}
            className="p-4 rounded-2xl bg-surface border border-border/30 dark:border-white/[0.07] hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 relative group shadow-sm hover:shadow-md"
          >
            {/* Top Rank Badge */}
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center font-mono">
                {item.rank}
              </span>
              {item.count > 0 && (
                <span className="text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/20">
                  {item.count}x this month
                </span>
              )}
            </div>

            {/* Inverted Positive Rule */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
                Golden Rule #{item.rank}
              </div>
              <div className="text-xs font-black text-foreground leading-snug">
                {item.rule}
              </div>
            </div>

            {/* Root Mistake tag - Pure text coordinates without mini-card box */}
            <div className="pt-1 text-[10px] text-muted flex items-center gap-1.5 font-mono">
              <span className="text-rose-600 dark:text-rose-400 font-bold">Root leak:</span>
              <span className="text-foreground font-semibold truncate">{item.leak}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Quote Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 border border-border/30 dark:border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-foreground">
              "Treat these 4 rules as sacred. Fix these 4, and your equity curve grows steadily."
            </div>
            <div className="text-muted text-[11px]">
              90% of account drawdowns come from repeating the exact same top 4 execution mistakes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
