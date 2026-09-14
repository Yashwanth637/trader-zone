import React, { useState, useRef } from 'react';
import { Trade } from '../../types/trade';
import { formatAdaptivePnl } from '../../lib/calculations';
import {
  calculateSymbolBreakdowns,
  calculateWeekdayStats,
  SymbolStat,
  WeekdayStat
} from '../../lib/scoreCalculations';

interface AnalyticsOverviewGridProps {
  trades: Trade[];
}

export const AnalyticsOverviewGrid: React.FC<AnalyticsOverviewGridProps> = ({ trades }) => {
  const closed = [...trades]
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime());

  const { pnlBySymbol, winRateBySymbol } = calculateSymbolBreakdowns(trades);
  const weekdayStats = calculateWeekdayStats(trades);

  // ----------------------------------------------------
  // Top-Left: Equity Curve Calculations & Interaction
  // ----------------------------------------------------
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    pnl: number;
  } | null>(null);

  const equitySvgRef = useRef<SVGSVGElement | null>(null);

  let cumulative = 0;
  const equityPoints: { date: string; shortDate: string; pnl: number }[] = [];

  closed.forEach(t => {
    cumulative += t.netPnl;
    const d = new Date(t.closeTime || t.openTime);
    const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    equityPoints.push({
      date: shortDate,
      shortDate,
      pnl: parseFloat(cumulative.toFixed(2))
    });
  });

  // SVG dimensions for Equity Curve
  const eqW = 500;
  const eqH = 220;
  const padLeft = 65;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 35;

  // Prepend $0 baseline if points don't start at 0
  const pointsWithStart = equityPoints.length > 0 && equityPoints[0].pnl !== 0
    ? [{ date: 'Start', shortDate: 'Start', pnl: 0 }, ...equityPoints]
    : equityPoints;

  const pnls = pointsWithStart.map(p => p.pnl);
  const rawMin = pnls.length > 0 ? Math.min(0, Math.min(...pnls)) : 0;
  const rawMax = pnls.length > 0 ? Math.max(0, Math.max(...pnls)) : 0;
  const rawRange = rawMax - rawMin;

  // Adaptive headroom/footroom
  const margin = Math.max(0.1, rawRange * 0.25);
  const minPnl = rawMin - margin;
  const maxPnl = rawMax + margin;
  const pnlRange = (maxPnl - minPnl) || 1;

  const getEqX = (index: number) => {
    if (pointsWithStart.length <= 1) return padLeft + (eqW - padLeft - padRight) / 2;
    return padLeft + (index / (pointsWithStart.length - 1)) * (eqW - padLeft - padRight);
  };

  const getEqY = (val: number) => {
    return eqH - padBottom - ((val - minPnl) / pnlRange) * (eqH - padTop - padBottom);
  };

  const zeroEqY = getEqY(0);

  const eqPathD = pointsWithStart.reduce((acc, p, i) => {
    const x = getEqX(i);
    const y = getEqY(p.pnl);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Y-axis tick intervals
  const yTicks = [
    maxPnl,
    maxPnl * 0.5,
    0,
    minPnl * 0.5,
    minPnl
  ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a);

  // X-axis sample dates (up to 8 points)
  const sampledXIndices: number[] = [];
  if (equityPoints.length > 0) {
    const step = Math.max(1, Math.floor(equityPoints.length / 8));
    for (let i = 0; i < equityPoints.length; i += step) {
      sampledXIndices.push(i);
    }
    if (!sampledXIndices.includes(equityPoints.length - 1)) {
      sampledXIndices.push(equityPoints.length - 1);
    }
  }

  const handleEquityMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!equitySvgRef.current || equityPoints.length === 0) return;
    const rect = equitySvgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const svgX = ((clientX - rect.left) / rect.width) * eqW;

    // Find nearest point
    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < equityPoints.length; i++) {
      const px = getEqX(i);
      const dist = Math.abs(px - svgX);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    const p = equityPoints[nearestIdx];
    setHoveredPoint({
      x: getEqX(nearestIdx),
      y: getEqY(p.pnl),
      date: p.date,
      pnl: p.pnl
    });
  };

  // ----------------------------------------------------
  // Top-Right: P&L by Symbol Calculations
  // ----------------------------------------------------
  const maxAbsPnlSymbol = pnlBySymbol.length > 0
    ? Math.max(...pnlBySymbol.map(s => Math.abs(s.netPnl)), 0.1)
    : 1;

  // ----------------------------------------------------
  // Bottom-Left: P&L by Day Calculations (Bidirectional)
  // ----------------------------------------------------
  const dayPnls = weekdayStats.map(w => w.netPnl);
  const maxDayPnl = Math.max(...dayPnls.map(p => Math.abs(p)), 0.1);
  // Adaptive scale limits with 15% headroom
  const dayScaleLimit = maxDayPnl * 1.15;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground tracking-tight">Analytics Overview</h2>

      {/* 2x2 Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ====================================================
            1. TOP-LEFT: Equity Curve
           ==================================================== */}
        <div className="premium-card p-6 flex flex-col justify-between min-h-[300px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-foreground">Equity Curve</h3>
          </div>

          {equityPoints.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-muted text-xs border border-dashed border-border rounded-xl">
              No closed trades recorded yet to plot equity curve.
            </div>
          ) : (
            <div className="relative w-full overflow-visible">
              <svg
                ref={equitySvgRef}
                viewBox={`0 0 ${eqW} ${eqH}`}
                className="w-full h-56 cursor-crosshair overflow-visible"
                onMouseMove={handleEquityMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Horizontal Grid lines & Y Ticks */}
                {yTicks.map((tickVal, idx) => {
                  const yPos = getEqY(tickVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={yPos}
                        x2={eqW - padRight}
                        y2={yPos}
                        stroke="currentColor"
                        strokeOpacity="0.08"
                        strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                        className="text-foreground"
                      />
                      <text
                        x={padLeft - 8}
                        y={yPos + 3.5}
                        textAnchor="end"
                        className="text-[10px] font-mono fill-muted"
                      >
                        {formatAdaptivePnl(tickVal)}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Bottom Line */}
                <line
                  x1={padLeft}
                  y1={eqH - padBottom}
                  x2={eqW - padRight}
                  y2={eqH - padBottom}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  className="text-foreground"
                />

                {/* X Axis Date Labels */}
                {sampledXIndices.map(i => {
                  const xPos = getEqX(i);
                  return (
                    <text
                      key={i}
                      x={xPos}
                      y={eqH - padBottom + 16}
                      textAnchor="middle"
                      className="text-[9.5px] font-mono fill-muted"
                    >
                      {equityPoints[i].shortDate}
                    </text>
                  );
                })}

                {/* Main Purple Line */}
                <path
                  d={eqPathD}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Tooltip & Crosshair */}
                {hoveredPoint && (
                  <g className="transition-all duration-75">
                    {/* Vertical guideline */}
                    <line
                      x1={hoveredPoint.x}
                      y1={padTop}
                      x2={hoveredPoint.x}
                      y2={eqH - padBottom}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />

                    {/* Outer Glow Ring */}
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r="6"
                      fill="#8b5cf6"
                      fillOpacity="0.4"
                    />
                    {/* Point Circle */}
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r="4"
                      fill="#8b5cf6"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Floating Tooltip Box */}
                    <g
                      transform={`translate(${
                        hoveredPoint.x > eqW - 140
                          ? hoveredPoint.x - 130
                          : hoveredPoint.x + 12
                      }, ${Math.max(padTop + 10, hoveredPoint.y - 25)})`}
                    >
                      <rect
                        width="115"
                        height="44"
                        rx="8"
                        className="fill-slate-900/95 stroke-slate-700/80"
                        strokeWidth="1"
                        filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"
                      />
                      <text x="10" y="16" className="text-[10px] font-medium fill-slate-400">
                        Trade: {hoveredPoint.date}
                      </text>
                      <text x="10" y="32" className="text-[11px] font-bold font-mono fill-white">
                        P&L : {hoveredPoint.pnl >= 0 ? `+${formatAdaptivePnl(hoveredPoint.pnl)}` : formatAdaptivePnl(hoveredPoint.pnl)}
                      </text>
                    </g>
                  </g>
                )}
              </svg>
            </div>
          )}
        </div>

        {/* ====================================================
            2. TOP-RIGHT: P&L by Symbol
           ==================================================== */}
        <div className="premium-card p-6 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-base font-bold text-foreground mb-4">P&L by Symbol</h3>

          {pnlBySymbol.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-muted text-xs border border-dashed border-border rounded-xl">
              No closed trade symbols to display.
            </div>
          ) : (
            <div className="space-y-4 my-auto">
              {pnlBySymbol.slice(0, 5).map(item => {
                const isPos = item.netPnl >= 0;
                const barWidthPct = Math.max(5, Math.min(100, (Math.abs(item.netPnl) / maxAbsPnlSymbol) * 100));

                return (
                  <div key={item.symbol} className="flex items-center text-xs">
                    {/* Symbol Name */}
                    <span className="w-20 font-bold text-foreground tracking-tight shrink-0">
                      {item.symbol}
                    </span>

                    {/* Progress Bar Container */}
                    <div className="flex-1 mx-3 h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden flex items-center">
                      <div
                        style={{ width: `${barWidthPct}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPos ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                    </div>

                    {/* Amount */}
                    <span
                      className={`w-28 text-right font-mono font-bold shrink-0 ${
                        isPos ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isPos ? `+$${item.netPnl.toFixed(2)}` : `-$${Math.abs(item.netPnl).toFixed(2)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ====================================================
            3. BOTTOM-LEFT: P&L by Day (Bidirectional Mon-Fri)
           ==================================================== */}
        <div className="premium-card p-6 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-base font-bold text-foreground mb-3">P&L by Day</h3>

          <div className="relative py-2 my-auto">
            {/* Weekday rows */}
            <div className="space-y-3.5">
              {weekdayStats.map(w => {
                const isPos = w.netPnl >= 0;
                const rawPct = (Math.abs(w.netPnl) / (dayScaleLimit || 1)) * 100;
                const widthPct = w.netPnl !== 0 ? Math.max(6, Math.min(100, rawPct)) : 0;

                return (
                  <div key={w.shortName} className="flex items-center text-xs">
                    {/* Day label */}
                    <span className="w-10 text-muted font-medium shrink-0">
                      {w.shortName}
                    </span>

                    {/* Bidirectional bar container: centered zero axis */}
                    <div className="relative flex-1 h-5 flex items-center">
                      {/* Center zero guide line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-border z-10" />

                      {/* Left Half: Negative Bars */}
                      <div className="w-1/2 h-full flex items-center justify-end pr-[1px]">
                        {!isPos && (
                          <div
                            style={{ width: `${widthPct}%` }}
                            className="h-4 bg-rose-500/90 rounded-l-sm transition-all duration-500"
                            title={`${w.shortName}: ${formatAdaptivePnl(w.netPnl)}`}
                          />
                        )}
                      </div>

                      {/* Right Half: Positive Bars */}
                      <div className="w-1/2 h-full flex items-center justify-start pl-[1px]">
                        {isPos && w.netPnl > 0 && (
                          <div
                            style={{ width: `${widthPct}%` }}
                            className="h-4 bg-emerald-500 rounded-r-sm transition-all duration-500"
                            title={`${w.shortName}: +${formatAdaptivePnl(w.netPnl)}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scale Ticks at bottom */}
            <div className="flex items-center justify-between text-[10px] font-mono text-muted pt-4 pl-10 border-t border-border/40 mt-3">
              <span>{formatAdaptivePnl(-dayScaleLimit)}</span>
              <span>$0.00</span>
              <span>+{formatAdaptivePnl(dayScaleLimit)}</span>
            </div>
          </div>
        </div>

        {/* ====================================================
            4. BOTTOM-RIGHT: Win Rate by Symbol
           ==================================================== */}
        <div className="premium-card p-6 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-base font-bold text-foreground mb-4">Win Rate by Symbol</h3>

          {winRateBySymbol.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-muted text-xs border border-dashed border-border rounded-xl">
              No closed trade symbols to display.
            </div>
          ) : (
            <div className="space-y-4 my-auto">
              {winRateBySymbol.slice(0, 5).map(item => {
                const isWinFavorable = item.winRate >= 50;

                return (
                  <div key={item.symbol} className="flex items-center text-xs">
                    {/* Symbol Name */}
                    <span className="w-20 font-bold text-foreground tracking-tight shrink-0">
                      {item.symbol}
                    </span>

                    {/* Win Rate Progress Bar */}
                    <div className="flex-1 mx-3 h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden flex items-center">
                      <div
                        style={{ width: `${Math.max(4, item.winRate)}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWinFavorable ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                    </div>

                    {/* Percentage & Trade Count */}
                    <span
                      className={`w-32 text-right font-mono font-bold shrink-0 ${
                        isWinFavorable ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {item.winRate}%{' '}
                      <span className="text-muted font-normal">
                        ({item.totalTrades} {item.totalTrades === 1 ? 'trade' : 'trades'})
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
