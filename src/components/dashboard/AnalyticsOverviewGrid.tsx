import React, { useState, useRef, useMemo } from 'react';
import { Trade } from '../../types/trade';
import { useTrading } from '../../context/TradingContext';
import { formatCurrency, formatAdaptivePnl, formatSignedPnl } from '../../lib/calculations';
import {
  calculateSymbolBreakdowns,
  calculateWeekdayStats,
  SymbolStat,
  WeekdayStat
} from '../../lib/scoreCalculations';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface AnalyticsOverviewGridProps {
  trades: Trade[];
  initialBalance?: number;
}

function formatCompactCurrency(val: number): string {
  const isNeg = val < -0.001;
  const abs = Math.abs(val);
  const sym = '$';
  if (abs >= 1_000_000) {
    return `${isNeg ? '-' : ''}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${isNeg ? '-' : ''}${sym}${(abs / 1_000).toFixed(1)}K`;
  }
  if (abs % 1 === 0) {
    return `${isNeg ? '-' : ''}${sym}${abs}`;
  }
  return `${isNeg ? '-' : ''}${sym}${abs.toFixed(2)}`;
}

function formatAxisCurrency(val: number, range: number = 100): string {
  const isNeg = val < -0.001;
  const abs = Math.abs(val);
  const sym = '$';
  if (abs >= 1_000_000) {
    return `${isNeg ? '-' : ''}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${isNeg ? '-' : ''}${sym}${(abs / 1_000).toFixed(1)}k`;
  }
  if (abs % 1 === 0) {
    return `${isNeg ? '-' : ''}${sym}${abs}`;
  }
  if (range <= 5) {
    return `${isNeg ? '-' : ''}${sym}${abs.toFixed(1)}`;
  }
  return `${isNeg ? '-' : ''}${sym}${abs.toFixed(0)}`;
}

export const AnalyticsOverviewGrid: React.FC<AnalyticsOverviewGridProps> = ({ trades, initialBalance }) => {
  let activeAccount: any = null;
  try {
    const trading = useTrading();
    activeAccount = trading?.activeAccount;
  } catch {
    // safe fallback if rendered outside TradingProvider
  }

  const closed = useMemo(() => {
    return [...trades]
      .filter(t => t.status === 'CLOSED')
      .sort((a, b) => new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime());
  }, [trades]);

  const { pnlBySymbol, winRateBySymbol } = useMemo(() => {
    return calculateSymbolBreakdowns(trades);
  }, [trades]);

  const weekdayStats = useMemo(() => {
    return calculateWeekdayStats(trades);
  }, [trades]);

  // ----------------------------------------------------
  // Top-Left: Equity Curve Calculations (Cumulative P&L starting at $0)
  // ----------------------------------------------------
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    pnl: number;
    tradePnl: number;
    drawdownPercent: number;
  } | null>(null);

  const equitySvgRef = useRef<SVGSVGElement | null>(null);

  const accountCapital = (initialBalance !== undefined && initialBalance > 0)
    ? initialBalance
    : (activeAccount?.initialBalance || 5000);

  // Compute cumulative P&L progression starting from 0 and peak profit drawdown with respect to account value
  const { equityPoints, peakProfit, currentPnl, maxDdPercent, currentDdPercent, isPositivePnl, curveColor } = useMemo(() => {
    let runningPnl = 0;
    let runningPeak = 0;

    const points: Array<{
      date: string;
      shortDate: string;
      pnl: number;
      tradePnl: number;
      drawdownPercent: number;
    }> = [
      {
        date: 'Start',
        shortDate: 'Start',
        pnl: 0,
        tradePnl: 0,
        drawdownPercent: 0
      }
    ];

    closed.forEach(t => {
      const pnl = Number(t.netPnl) || 0;
      runningPnl = parseFloat((runningPnl + pnl).toFixed(2));
      if (runningPnl > runningPeak) {
        runningPeak = runningPnl;
      }
      const peakAccountValue = accountCapital + runningPeak;
      const ddAmount = runningPeak - runningPnl;
      const ddPct = peakAccountValue > 0
        ? (ddAmount / peakAccountValue) * 100
        : 0;

      const rawTime = t.closeTime || t.openTime;
      const safeTime = typeof rawTime === 'string'
        ? rawTime.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')
        : rawTime;
      const d = new Date(safeTime);
      const shortDate = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'Trade';

      points.push({
        date: shortDate,
        shortDate,
        pnl: runningPnl,
        tradePnl: pnl,
        drawdownPercent: parseFloat(ddPct.toFixed(2))
      });
    });

    const allPnls = points.map(p => p.pnl);
    const peak = Math.max(0, ...allPnls);
    const curPnl = points[points.length - 1].pnl;
    const maxDd = Math.max(0, ...points.map(p => p.drawdownPercent));
    const peakAccountValue = accountCapital + peak;
    const curDdU = peak - curPnl;
    const curDdP = peakAccountValue > 0 ? (curDdU / peakAccountValue) * 100 : 0;

    const isPos = curPnl >= 0;
    const color = isPos ? '#A9E34B' : '#f43f5e';

    return {
      equityPoints: points,
      peakProfit: peak,
      currentPnl: curPnl,
      maxDdPercent: maxDd,
      currentDdPercent: curDdP,
      isPositivePnl: isPos,
      curveColor: color
    };
  }, [closed, accountCapital]);

  // SVG dimensions for Equity Curve
  const eqW = 560;
  const eqH = 240;
  const padLeft = 65;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;

  const allPnls = equityPoints.map(p => p.pnl);
  const minVal = Math.min(...allPnls, 0);
  const maxVal = Math.max(...allPnls, 0);
  const valRange = maxVal - minVal;

  // Adaptive headroom/footroom centered around $0
  const margin = Math.max(1, valRange * 0.18);
  const minAxis = minVal - margin;
  const maxAxis = maxVal + margin;
  const axisRange = (maxAxis - minAxis) || 1;

  const getEqX = (index: number) => {
    if (equityPoints.length <= 1) return padLeft + (eqW - padLeft - padRight) / 2;
    return padLeft + (index / (equityPoints.length - 1)) * (eqW - padLeft - padRight);
  };

  const getEqY = (val: number) => {
    return eqH - padBottom - ((val - minAxis) / axisRange) * (eqH - padTop - padBottom);
  };

  const initialY = getEqY(0);

  const eqPathD = equityPoints.reduce((acc, p, i) => {
    const x = getEqX(i);
    const y = getEqY(p.pnl);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaPathD = equityPoints.length > 0
    ? `${eqPathD} L ${getEqX(equityPoints.length - 1)} ${eqH - padBottom} L ${getEqX(0)} ${eqH - padBottom} Z`
    : '';

  // 5 Evenly spaced Y ticks around $0
  const yTicks = [
    maxAxis,
    minAxis + axisRange * 0.75,
    minAxis + axisRange * 0.5,
    minAxis + axisRange * 0.25,
    minAxis
  ];

  // X-axis date labels: Smart collision detection guaranteeing min 58px gap so dates never overlap (Image 2)
  const minSpacing = 58;
  const xLabels = useMemo(() => {
    const labels: Array<{ x: number; label: string }> = [];
    if (equityPoints.length <= 1) return labels;

    const tradePoints = equityPoints.slice(1);
    let lastX = -Infinity;

    for (let i = 0; i < tradePoints.length; i++) {
      const pointIdx = i + 1;
      const xPos = getEqX(pointIdx);
      const isFirst = i === 0;
      const isLast = i === tradePoints.length - 1;
      const label = tradePoints[i].date;

      if (isFirst) {
        labels.push({ x: xPos, label });
        lastX = xPos;
        continue;
      }

      if (isLast) {
        if (xPos - lastX >= minSpacing) {
          labels.push({ x: xPos, label });
        } else if (labels.length > 1) {
          labels[labels.length - 1] = { x: xPos, label };
        }
        continue;
      }

      if (xPos - lastX >= minSpacing && (eqW - padRight - xPos) >= (minSpacing * 0.7)) {
        labels.push({ x: xPos, label });
        lastX = xPos;
      }
    }

    return labels;
  }, [equityPoints]);

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
      pnl: p.pnl,
      tradePnl: p.tradePnl,
      drawdownPercent: p.drawdownPercent
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
            1. TOP-LEFT: Equity Curve (Exact Image 1 Visuals)
           ==================================================== */}
        <div className="premium-card p-5 sm:p-6 flex flex-col justify-between min-h-[360px]">
          {/* Header matching Image 1: NO icon/logo before 'Equity Curve' as explicitly requested */}
          <div className="mb-2">
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Equity Curve
            </h3>
            <p className="text-xs text-muted font-medium mt-0.5">
              Account balance over time
            </p>
          </div>

          {/* Top 3 Metric Cards matching Image 1 & 2: 96% transparent with subtle borders */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-3">
            {/* 1. Peak */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.05] backdrop-blur-sm transition-colors">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Peak</span>
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono text-foreground tracking-tight mt-1 truncate">
                {formatCompactCurrency(peakProfit)}
              </div>
            </div>

            {/* 2. Max DD */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.05] backdrop-blur-sm transition-colors">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                <span>Max DD</span>
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono text-amber-500 tracking-tight mt-1 truncate">
                {maxDdPercent >= 10 ? maxDdPercent.toFixed(1) : maxDdPercent.toFixed(2)}%
              </div>
            </div>

            {/* 3. Current */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.05] backdrop-blur-sm transition-colors">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Activity className="w-3.5 h-3.5 text-indigo-500 dark:text-violet-400" />
                <span>Current</span>
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono text-foreground tracking-tight mt-1 truncate">
                {formatCompactCurrency(currentPnl)}
              </div>
            </div>
          </div>

          {equityPoints.length <= 1 ? (
            <div className="h-56 flex flex-col items-center justify-center text-muted text-xs border border-dashed border-border rounded-2xl my-2">
              No closed trades recorded yet to plot equity curve.
            </div>
          ) : (
            <div className="relative w-full overflow-visible my-1">
              {/* Interactive Floating Card Tooltip flexible for light and dark theme (Image 2) */}
              {hoveredPoint && (
                <div
                  style={{
                    left: `${(hoveredPoint.x / eqW) * 100}%`,
                    top: `${Math.max(8, Math.min(62, (hoveredPoint.y / eqH) * 100 - 35))}%`,
                    transform: hoveredPoint.x > eqW * 0.62 ? 'translate(-105%, 0)' : 'translate(12px, 0)'
                  }}
                  className="absolute z-20 pointer-events-none p-3 rounded-2xl bg-white/95 dark:bg-[#0c0d12]/95 border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-md min-w-[145px] space-y-1 transition-all duration-75"
                >
                  <div className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                    {hoveredPoint.date}
                  </div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-white tracking-tight">
                    {hoveredPoint.pnl >= 0 ? formatCurrency(hoveredPoint.pnl) : `-${formatCurrency(Math.abs(hoveredPoint.pnl))}`}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5 text-xs font-mono">
                    <span className={hoveredPoint.tradePnl >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                      {hoveredPoint.tradePnl >= 0 ? `+${formatCurrency(hoveredPoint.tradePnl)}` : `-${formatCurrency(Math.abs(hoveredPoint.tradePnl))}`}
                    </span>
                    <span className="text-amber-500 dark:text-amber-400 font-semibold text-[11px]">
                      DD: {hoveredPoint.drawdownPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              <svg
                ref={equitySvgRef}
                viewBox={`0 0 ${eqW} ${eqH}`}
                className="w-full h-56 cursor-crosshair overflow-visible select-none"
                onMouseMove={handleEquityMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="equityCurveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={curveColor} stopOpacity="0.25" />
                    <stop offset="65%" stopColor={curveColor} stopOpacity="0.06" />
                    <stop offset="100%" stopColor={curveColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

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
                        strokeOpacity="0.06"
                        strokeDasharray="3 3"
                        className="text-foreground"
                      />
                      <text
                        x={padLeft - 8}
                        y={yPos + 3.5}
                        textAnchor="end"
                        className="text-[10px] font-mono fill-muted"
                      >
                        {formatAxisCurrency(tickVal, valRange)}
                      </text>
                    </g>
                  );
                })}

                {/* Initial Baseline ($0) Dashed Line */}
                {initialY >= padTop && initialY <= eqH - padBottom && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={initialY}
                      x2={eqW - padRight}
                      y2={initialY}
                      stroke="currentColor"
                      strokeOpacity="0.35"
                      strokeDasharray="4 4"
                      className="text-slate-400 dark:text-slate-500"
                    />
                    <text
                      x={(padLeft + eqW - padRight) / 2}
                      y={initialY - 4}
                      textAnchor="middle"
                      className="text-[9px] font-mono fill-slate-400 dark:fill-slate-500 select-none tracking-wider"
                    >
                      Initial ($0)
                    </text>
                  </g>
                )}

                {/* Left Y-Axis Vertical Line */}
                <line
                  x1={padLeft}
                  y1={padTop}
                  x2={padLeft}
                  y2={eqH - padBottom}
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  className="text-slate-400 dark:text-slate-600"
                />

                {/* Bottom X-Axis Line */}
                <line
                  x1={padLeft}
                  y1={eqH - padBottom}
                  x2={eqW - padRight}
                  y2={eqH - padBottom}
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  className="text-slate-400 dark:text-slate-600"
                />

                {/* X Axis Non-Overlapping Date Labels (Guaranteed 58px minimum separation) */}
                {xLabels.map((item, idx) => (
                  <text
                    key={idx}
                    x={item.x}
                    y={eqH - padBottom + 18}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-muted select-none"
                  >
                    {item.label}
                  </text>
                ))}

                {/* Dynamic Gradient Filled Area */}
                <path
                  d={areaPathD}
                  fill="url(#equityCurveGradient)"
                />

                {/* Dynamic Curve Color (#A9E34B or Red #f43f5e) */}
                <path
                  d={eqPathD}
                  fill="none"
                  stroke={curveColor}
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Hover guideline and glowing dot */}
                {hoveredPoint && (
                  <g>
                    {/* Solid vertical guideline flexible across light and dark theme */}
                    <line
                      x1={hoveredPoint.x}
                      y1={padTop}
                      x2={hoveredPoint.x}
                      y2={eqH - padBottom}
                      stroke="currentColor"
                      strokeOpacity="0.45"
                      strokeWidth="1.2"
                      className="text-slate-900 dark:text-white"
                    />
                    {/* Glowing outer ring */}
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r="7"
                      fill={curveColor}
                      fillOpacity="0.35"
                    />
                    {/* Inner point with theme-adaptive border */}
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r="4"
                      fill={curveColor}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-white dark:text-[#0b0b0e]"
                    />
                  </g>
                )}
              </svg>
            </div>
          )}

          {/* Bottom Drawdown Alert Banner */}
          <div className={`mt-3 rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 text-xs font-bold transition-colors ${
            currentDdPercent > 0.05
              ? 'bg-amber-500/10 border border-amber-500/25 text-amber-500'
              : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-500'
          }`}>
            {currentDdPercent > 0.05 ? (
              <>
                <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
                <span>In drawdown: {currentDdPercent.toFixed(2)}% from peak profit ({formatCurrency(peakProfit)})</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>At peak profit: {formatCurrency(peakProfit)} (0.00% drawdown)</span>
              </>
            )}
          </div>
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
                      {formatSignedPnl(item.netPnl)}
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
              <span>{formatAdaptivePnl(0)}</span>
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
