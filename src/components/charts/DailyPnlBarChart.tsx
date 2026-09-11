import React from 'react';
import { Trade } from '../../types/trade';
import { formatCurrency } from '../../lib/calculations';

interface DailyPnlBarChartProps {
  trades: Trade[];
}

export const DailyPnlBarChart: React.FC<DailyPnlBarChartProps> = ({ trades }) => {
  const closed = trades.filter(t => t.status === 'CLOSED');

  // Group by day
  const dayPnlMap: Record<string, { pnl: number; count: number }> = {};
  closed.forEach(t => {
    const d = (t.closeTime || t.openTime).split('T')[0];
    if (!dayPnlMap[d]) dayPnlMap[d] = { pnl: 0, count: 0 };
    dayPnlMap[d].pnl += t.netPnl;
    dayPnlMap[d].count += 1;
  });

  const days = Object.keys(dayPnlMap).sort().slice(-14); // Last 14 days
  if (days.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-slate-500 text-xs border border-dashed border-border rounded-xl">
        No daily trading data available.
      </div>
    );
  }

  const values = days.map(d => dayPnlMap[d].pnl);
  const maxAbs = Math.max(...values.map(Math.abs), 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Daily Net P&L (Recent Sessions)
        </span>
        <span className="text-xs text-slate-500">Last {days.length} Active Days</span>
      </div>

      <div className="h-44 flex items-end gap-2 pt-6 pb-6 px-2 border-b border-border/60 relative">
        {/* Zero baseline */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700/60" />

        {days.map(d => {
          const item = dayPnlMap[d];
          const isPos = item.pnl >= 0;
          const heightPct = Math.min(Math.round((Math.abs(item.pnl) / maxAbs) * 45), 45); // max 45% up or down
          const dateLabel = new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

          return (
            <div key={d} className="flex-1 flex flex-col items-center h-full justify-center group relative">
              {/* Positive bar */}
              {isPos ? (
                <div className="w-full flex flex-col items-center justify-end h-1/2">
                  <div
                    style={{ height: `${Math.max(heightPct, 8)}%` }}
                    className="w-full max-w-[28px] rounded-t-md bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
                  />
                </div>
              ) : (
                <div className="w-full h-1/2" />
              )}

              {/* Negative bar */}
              {!isPos ? (
                <div className="w-full flex flex-col items-center justify-start h-1/2">
                  <div
                    style={{ height: `${Math.max(heightPct, 8)}%` }}
                    className="w-full max-w-[28px] rounded-b-md bg-rose-500 hover:bg-rose-400 transition-all cursor-pointer shadow-sm shadow-rose-500/20"
                  />
                </div>
              ) : (
                <div className="w-full h-1/2" />
              )}

              {/* Day label */}
              <span className="text-[10px] text-slate-500 absolute -bottom-5 font-mono">
                {dateLabel}
              </span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-surface border border-border-glow px-2.5 py-1.5 rounded-lg shadow-xl text-center whitespace-nowrap text-xs">
                  <div className="text-[10px] text-slate-400">{d}</div>
                  <div className={`font-bold font-mono ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(item.pnl)}
                  </div>
                  <div className="text-[10px] text-slate-500">{item.count} trade(s)</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
