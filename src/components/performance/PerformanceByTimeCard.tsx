import React, { useState } from 'react';
import { HourlyPerformanceData } from '../../lib/performanceAnalytics';
import { formatAdaptivePnl } from '../../lib/calculations';
import { Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface PerformanceByTimeCardProps {
  data: HourlyPerformanceData;
}

export const PerformanceByTimeCard: React.FC<PerformanceByTimeCardProps> = ({ data }) => {
  const { hourlyStats, bestHour, worstHour, mostActiveHour, advice } = data;
  const [hoveredHour, setHoveredHour] = useState<typeof hourlyStats[0] | null>(null);

  // SVG dimensions
  const svgW = 500;
  const svgH = 220;
  const padLeft = 70;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;

  // Compute max positive and max negative PnL for scaling
  const pnls = hourlyStats.map(h => h.netPnl);
  const posPnls = pnls.filter(p => p > 0);
  const negPnls = pnls.filter(p => p < 0);
  const rawMaxPos = posPnls.length > 0 ? Math.max(...posPnls) : 0;
  const rawMaxNeg = negPnls.length > 0 ? Math.min(...negPnls) : 0;

  // Dynamic adaptive scale limits with 25% headroom margin
  const maxMag = Math.max(0.1, rawMaxPos, Math.abs(rawMaxNeg));
  const margin = maxMag * 0.25;
  const yUpper = rawMaxPos > 0 ? rawMaxPos + margin : margin;
  const yLower = rawMaxNeg < 0 ? rawMaxNeg - margin : -margin;
  const totalYRange = (yUpper - yLower) || 1;

  const getY = (val: number) => {
    return padTop + ((yUpper - val) / totalYRange) * (svgH - padTop - padBottom);
  };

  const zeroY = getY(0);

  // Y-axis ticks
  const yTicks = [yUpper, yUpper * 0.5, 0, yLower * 0.5, yLower].sort((a, b) => b - a);

  // X coordinate calculation for bars
  const barCount = hourlyStats.length;
  const chartW = svgW - padLeft - padRight;
  const slotW = chartW / Math.max(1, barCount);
  const barW = Math.min(28, slotW * 0.65);

  return (
    <div className="premium-card p-6 flex flex-col justify-between h-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Performance by Time
            </h2>
            <p className="text-xs text-muted">P&L by hour of day</p>
          </div>
        </div>
      </div>

      {/* Hourly Bar Chart */}
      <div className="relative w-full overflow-visible py-1">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-52 overflow-visible select-none"
          onMouseLeave={() => setHoveredHour(null)}
        >
          {/* Y Axis Grid lines & Ticks */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgW - padRight}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={val === 0 ? 0.2 : 0.08}
                  strokeWidth={val === 0 ? 1.2 : 1}
                  className="text-foreground"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[9.5px] font-mono fill-muted"
                >
                  {formatAdaptivePnl(val)}
                </text>
              </g>
            );
          })}

          {/* Vertical Hourly Bars */}
          {hourlyStats.map((item, idx) => {
            const isPos = item.netPnl >= 0;
            const barX = padLeft + (idx + 0.5) * slotW - barW / 2;
            const pnlY = getY(item.netPnl);
            const barY = isPos ? pnlY : zeroY;
            const barHeight = item.netPnl !== 0 ? Math.max(4, Math.abs(pnlY - zeroY)) : 0;

            return (
              <g key={item.hourStr}>
                {/* Bar Rect */}
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barHeight}
                  rx={3}
                  className={`transition-all duration-300 cursor-pointer ${
                    isPos
                      ? 'fill-emerald-500 hover:fill-emerald-400'
                      : 'fill-rose-500 hover:fill-rose-400'
                  }`}
                  onMouseEnter={() => setHoveredHour(item)}
                />

                {/* X-axis Hour Label */}
                <text
                  x={padLeft + (idx + 0.5) * slotW}
                  y={svgH - padBottom + 16}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-muted"
                >
                  {item.hourStr}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip when hovering over a bar */}
        {hoveredHour && (
          <div className="absolute top-2 right-4 px-3 py-1.5 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-xs text-white z-20 pointer-events-none">
            <div className="font-bold text-slate-300">{hoveredHour.hourStr}</div>
            <div className={`font-mono ${hoveredHour.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              Net P&L: {hoveredHour.netPnl > 0 ? '+' : ''}{formatAdaptivePnl(hoveredHour.netPnl)}
            </div>
            <div className="text-[10px] text-slate-400">
              {hoveredHour.tradeCount} trades · {hoveredHour.avgPnl > 0 ? '+' : ''}{formatAdaptivePnl(hoveredHour.avgPnl)} avg
            </div>
          </div>
        )}
      </div>

      {/* 3 Metrics Subcards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Best Hour */}
        <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Best Hour</span>
          </div>
          <div className="text-lg font-mono font-black text-emerald-500 mt-1">
            {bestHour ? bestHour.hourStr : '--:--'}
          </div>
          <div className="text-xs text-muted mt-0.5 font-medium">
            {bestHour ? `+${formatAdaptivePnl(bestHour.avgPnl)} avg` : 'No data'}
          </div>
        </div>

        {/* Worst Hour */}
        <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Worst Hour</span>
          </div>
          <div className="text-lg font-mono font-black text-rose-500 mt-1">
            {worstHour ? worstHour.hourStr : '--:--'}
          </div>
          <div className="text-xs text-muted mt-0.5 font-medium">
            {worstHour ? `${formatAdaptivePnl(worstHour.avgPnl)} avg` : 'No losses'}
          </div>
        </div>

        {/* Most Active */}
        <div className="p-3.5 rounded-xl border border-violet-500/25 bg-violet-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-violet-400 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Most Active</span>
          </div>
          <div className="text-lg font-mono font-black text-violet-400 mt-1">
            {mostActiveHour ? mostActiveHour.hourStr : '--:--'}
          </div>
          <div className="text-xs text-muted mt-0.5 font-medium">
            {mostActiveHour ? `${mostActiveHour.tradeCount} trades` : '0 trades'}
          </div>
        </div>
      </div>

      {/* Dynamic Advice Banner */}
      <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
        advice.isWarning
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-emerald-500/30 bg-emerald-500/5'
      }`}>
        <div className="mt-0.5 shrink-0">
          {advice.isWarning ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        <div>
          <div className={`text-xs font-bold ${
            advice.isWarning ? 'text-amber-500' : 'text-emerald-500'
          }`}>
            {advice.title}
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            {advice.description}
          </div>
        </div>
      </div>
    </div>
  );
};
