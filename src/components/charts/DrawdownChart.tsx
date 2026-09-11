import React from 'react';
import { Trade } from '../../types/trade';

interface DrawdownChartProps {
  trades: Trade[];
  initialBalance?: number;
}

export const DrawdownChart: React.FC<DrawdownChartProps> = ({
  trades,
  initialBalance = 100000
}) => {
  const closed = [...trades]
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime());

  if (closed.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-xs border border-dashed border-border rounded-xl">
        No drawdown data available.
      </div>
    );
  }

  let peak = initialBalance;
  let current = initialBalance;
  const points: { ddPct: number; date: string }[] = [{ ddPct: 0, date: 'Start' }];

  closed.forEach(t => {
    current += t.netPnl;
    if (current > peak) peak = current;
    const dd = peak > 0 ? -((peak - current) / peak) * 100 : 0;
    points.push({
      ddPct: parseFloat(dd.toFixed(2)),
      date: new Date(t.closeTime || t.openTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  });

  const minDd = Math.min(...points.map(p => p.ddPct), -5);
  const width = 800;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const getX = (i: number) => paddingX + (i / (points.length - 1)) * (width - paddingX * 2);
  const getY = (val: number) => paddingY + ((0 - val) / (0 - minDd || 1)) * (height - paddingY * 2);

  const pathD = points.reduce((acc, p, i) => {
    const x = getX(i);
    const y = getY(p.ddPct);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${getX(points.length - 1)} ${paddingY} L ${getX(0)} ${paddingY} Z`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Underwater Drawdown Curve</span>
        <span className="text-xs font-mono text-rose-400">Max: {minDd.toFixed(2)}%</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Zero baseline */}
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#64748b" strokeWidth="1" />
        <text x={paddingX - 8} y={paddingY + 3} textAnchor="end" fontSize="10" fill="#64748b" className="font-mono">
          0%
        </text>

        {/* Max drawdown line */}
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(244, 63, 94, 0.2)" strokeDasharray="3 3" />
        <text x={paddingX - 8} y={height - paddingY + 3} textAnchor="end" fontSize="10" fill="#f43f5e" className="font-mono">
          {minDd.toFixed(1)}%
        </text>

        <path d={areaD} fill="url(#ddGrad)" />
        <path d={pathD} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};
