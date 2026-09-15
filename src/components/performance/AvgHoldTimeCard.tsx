import React, { useState } from 'react';
import { AvgHoldTimeData } from '../../lib/performanceAnalytics';
import { Clock, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AvgHoldTimeCardProps {
  data: AvgHoldTimeData;
}

export const AvgHoldTimeCard: React.FC<AvgHoldTimeCardProps> = ({ data }) => {
  const {
    avgWinMinutes,
    avgLossMinutes,
    maxDuration,
    winTradeCount,
    lossTradeCount,
    isLosersLonger,
    advice,
    hasData
  } = data;

  const [showTooltip, setShowTooltip] = useState(false);

  // Width percentages for the horizontal progress tracks
  const winPct = maxDuration > 0 && avgWinMinutes > 0
    ? Math.max(3, Math.min(100, Math.round((avgWinMinutes / maxDuration) * 100)))
    : 0;

  const lossPct = maxDuration > 0 && avgLossMinutes > 0
    ? Math.max(3, Math.min(100, Math.round((avgLossMinutes / maxDuration) * 100)))
    : 0;

  const formatDurationDisplay = (mins: number, isWin: boolean) => {
    if (mins <= 0) return '0 min';
    if (mins >= 60) {
      const hrs = (mins / 60).toFixed(1);
      return isWin ? `~${mins} min (${hrs}h)` : `${mins} min (${hrs}h)`;
    }
    return isWin ? `~${mins} min` : `${mins} min`;
  };

  return (
    <div className="premium-card p-6 flex flex-col justify-between relative select-none h-full">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Avg Hold Time: Winners vs Losers
            </h2>
          </div>

          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-muted hover:text-foreground transition-colors p-1 rounded-full focus:outline-none"
              aria-label="More info"
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-7 w-64 p-3 bg-surface-card border border-border rounded-xl shadow-xl z-30 text-xs text-muted pointer-events-none">
                Compares the average duration of profitable trades against losing trades to uncover whether you cut winners prematurely or allow losers to run.
              </div>
            )}
          </div>
        </div>

        {/* Trade Hold Times */}
        <div className="space-y-6">
          {/* Winning Trades */}
          <div>
            <div className="flex items-center justify-between text-sm font-medium mb-2">
              <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                Winning Trades
                <span className="text-[11px] text-muted font-normal">({winTradeCount} trades)</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatDurationDisplay(avgWinMinutes, true)}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-surface-card border border-border/50 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-700 ease-out"
                style={{ width: `${winPct}%` }}
              />
            </div>
          </div>

          {/* Losing Trades */}
          <div>
            <div className="flex items-center justify-between text-sm font-medium mb-2">
              <span className="text-rose-500 font-semibold flex items-center gap-1.5">
                Losing Trades
                <span className="text-[11px] text-muted font-normal">({lossTradeCount} trades)</span>
              </span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {formatDurationDisplay(avgLossMinutes, false)}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-surface-card border border-border/50 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all duration-700 ease-out"
                style={{ width: `${lossPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Warning / Insight Callout Box */}
      <div className="mt-8">
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs transition-colors ${
            !hasData
              ? 'bg-surface-card border-border text-muted'
              : isLosersLonger
              ? 'bg-rose-500/5 border-rose-500/20 text-rose-200'
              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
          }`}
        >
          {isLosersLonger ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{advice.message}</span>
        </div>
      </div>
    </div>
  );
};
