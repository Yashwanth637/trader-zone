import React from 'react';
import { StreakTrackingData } from '../../lib/performanceAnalytics';
import { Flame, Info, AlertCircle } from 'lucide-react';

interface StreakTrackingCardProps {
  data: StreakTrackingData;
}

export const StreakTrackingCard: React.FC<StreakTrackingCardProps> = ({ data }) => {
  const { currentStreak, longestWin, longestLoss, history, hasData } = data;

  if (!hasData) {
    return (
      <div className="premium-card p-6 flex flex-col justify-between min-h-[420px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Streak Tracking</h2>
          </div>
          <Info className="w-4 h-4 text-muted" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted text-xs border border-dashed border-border rounded-xl p-8">
          <AlertCircle className="w-6 h-6 mb-2 opacity-50 text-muted" />
          <span>No trade streak history available yet. Record closed trades to track win/loss runs.</span>
        </div>
      </div>
    );
  }

  const isWinning = currentStreak.type === 'win';
  const isLosing = currentStreak.type === 'loss';

  return (
    <div className="premium-card p-6 flex flex-col justify-between select-none">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Streak Tracking</h2>
          </div>
          <div
            className="text-muted hover:text-foreground transition-colors cursor-help"
            title="Tracks consecutive win and loss sequences across your closed trades"
          >
            <Info className="w-4 h-4" />
          </div>
        </div>

        {/* Current Streak */}
        <div className="mb-5">
          <div className="text-[10px] uppercase font-bold text-muted tracking-wider mb-1">
            CURRENT STREAK
          </div>
          <div className="flex items-baseline gap-2.5">
            <span
              className={`text-4xl font-black font-mono ${
                isWinning ? 'text-emerald-500' : isLosing ? 'text-rose-500' : 'text-foreground'
              }`}
            >
              {currentStreak.count.toFixed(2)}
            </span>
            <span
              className={`text-sm font-bold ${
                isWinning ? 'text-emerald-500' : isLosing ? 'text-rose-500' : 'text-muted'
              }`}
            >
              {isWinning
                ? 'Winning Streak'
                : isLosing
                ? 'Losing Streak'
                : 'No Active Streak'}
            </span>
          </div>
        </div>

        {/* Longest Win & Longest Loss Subcards */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="p-3.5 rounded-xl bg-surface-card/60 border border-border">
            <div className="text-xs text-muted font-medium mb-1">Longest Win</div>
            <div className="text-2xl font-black font-mono text-emerald-500">
              {longestWin}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-card/60 border border-border">
            <div className="text-xs text-muted font-medium mb-1">Longest Loss</div>
            <div className="text-2xl font-black font-mono text-rose-500">
              {longestLoss}
            </div>
          </div>
        </div>
      </div>

      {/* History Sequence Section */}
      <div className="mt-auto pt-3 border-t border-border">
        <div className="text-[10px] uppercase font-bold text-muted tracking-wider mb-2.5">
          HISTORY
        </div>
        {history.length > 0 ? (
          <div className="flex flex-wrap gap-2 items-center max-h-24 overflow-y-auto pr-1">
            {history.map((item) => (
              <span
                key={item.id}
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border transition-all ${
                  item.type === 'W'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {item.type}{item.count}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted">No streak history yet</div>
        )}
      </div>
    </div>
  );
};
