import React from 'react';
import { Trade } from '../../types/trade';
import { formatCurrency } from '../../lib/calculations';

interface HeatmapProps {
  trades: Trade[];
}

export const HeatmapChart: React.FC<HeatmapProps> = ({ trades }) => {
  const closed = trades.filter(t => t.status === 'CLOSED');

  // Days of week: Mon, Tue, Wed, Thu, Fri
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayStats: Record<string, { pnl: number; count: number; wins: number }> = {
    Mon: { pnl: 0, count: 0, wins: 0 },
    Tue: { pnl: 0, count: 0, wins: 0 },
    Wed: { pnl: 0, count: 0, wins: 0 },
    Thu: { pnl: 0, count: 0, wins: 0 },
    Fri: { pnl: 0, count: 0, wins: 0 }
  };

  closed.forEach(t => {
    const d = new Date(t.closeTime || t.openTime);
    const dayIdx = d.getDay(); // 0 is Sun, 1 is Mon...
    const name = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIdx];
    if (dayStats[name]) {
      dayStats[name].pnl += t.netPnl;
      dayStats[name].count += 1;
      if (t.netPnl > 0) dayStats[name].wins += 1;
    }
  });

  return (
    <div className="w-full">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Day-of-Week Performance
      </div>
      <div className="grid grid-cols-5 gap-2.5">
        {dayNames.map(day => {
          const s = dayStats[day];
          const isPos = s.pnl >= 0;
          const winRate = s.count > 0 ? Math.round((s.wins / s.count) * 100) : 0;
          return (
            <div
              key={day}
              className={`p-3 rounded-xl border text-center transition-all ${
                s.count === 0
                  ? 'bg-surface-card/40 border-border/50 text-slate-500'
                  : isPos
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <div className="text-xs font-bold text-slate-300 mb-1">{day}</div>
              <div className={`text-sm font-black font-mono ${s.count === 0 ? 'text-slate-500' : isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {s.count > 0 ? formatCurrency(s.pnl) : '$0.00'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {s.count > 0 ? `${winRate}% Win (${s.count}T)` : 'No trades'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
