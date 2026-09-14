import React from 'react';
import { ProfitDistributionData } from '../../lib/performanceAnalytics';
import { formatCurrency, formatSignedPnl } from '../../lib/calculations';
import { Target, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface ProfitDistributionCardProps {
  data: ProfitDistributionData;
}

export const ProfitDistributionCard: React.FC<ProfitDistributionCardProps> = ({ data }) => {
  const { netPnl, biggestWin, biggestLoss, avgWin, avgLoss, tiers } = data;
  const isPnlPos = netPnl >= 0;

  // Donut SVG geometry
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 75;
  const innerR = 48;
  const strokeW = outerR - innerR; // 27
  const midR = (outerR + innerR) / 2; // 61.5
  const circumference = 2 * Math.PI * midR;

  // Compute total counts for donut slices
  const totalCount = tiers.reduce((s, t) => s + t.count, 0);

  // SVG circle dash offsets
  let cumulativePct = 0;
  const slices = tiers.map(t => {
    // If no trades, display 4 equal slices
    const pct = totalCount > 0 ? t.count / totalCount : 0.25;
    const dashLength = pct * circumference;
    const gap = totalCount > 0 && pct > 0.03 ? 4 : 0;
    const dashArray = `${Math.max(0, dashLength - gap)} ${circumference - Math.max(0, dashLength - gap)}`;
    const dashOffset = -cumulativePct * circumference;
    cumulativePct += pct;
    return {
      name: t.name,
      count: t.count,
      pct: Math.round(pct * 100),
      color: t.color,
      dashArray,
      dashOffset
    };
  });

  return (
    <div className="premium-card p-6 flex flex-col justify-between h-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Profit Distribution
            </h2>
            <p className="text-xs text-muted">Win/loss categorization</p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-xl font-mono font-black tracking-tight ${isPnlPos ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatSignedPnl(netPnl)}
          </div>
          <div className="text-xs text-muted font-medium">Net P&L</div>
        </div>
      </div>

      {/* Donut Chart Center */}
      <div className="flex items-center justify-center py-2 relative">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-48 h-48 transform -rotate-90 select-none overflow-visible"
        >
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={midR}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeW}
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              className="transition-all duration-700 ease-out"
            />
          ))}
        </svg>

        {/* Center Cutout Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-surface-card border border-border/40 shadow-inner flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold text-muted uppercase">Trades</span>
            <span className="font-mono text-sm font-bold text-foreground">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* 2x2 Subcards at Bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Biggest Win */}
        <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Biggest Win</span>
          </div>
          <div className="text-lg font-mono font-bold text-emerald-500 mt-1">
            +{formatCurrency(biggestWin)}
          </div>
        </div>

        {/* Biggest Loss */}
        <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>Biggest Loss</span>
          </div>
          <div className="text-lg font-mono font-bold text-rose-500 mt-1">
            -{formatCurrency(Math.abs(biggestLoss))}
          </div>
        </div>

        {/* Avg Win */}
        <div className="p-3.5 rounded-xl border border-border bg-black/5 dark:bg-white/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Avg Win</span>
          </div>
          <div className="text-lg font-mono font-bold text-emerald-500 mt-1">
            +{formatCurrency(avgWin)}
          </div>
        </div>

        {/* Avg Loss */}
        <div className="p-3.5 rounded-xl border border-border bg-black/5 dark:bg-white/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
            <DollarSign className="w-3.5 h-3.5 text-rose-500" />
            <span>Avg Loss</span>
          </div>
          <div className="text-lg font-mono font-bold text-rose-500 mt-1">
            -{formatCurrency(Math.abs(avgLoss))}
          </div>
        </div>
      </div>
    </div>
  );
};
