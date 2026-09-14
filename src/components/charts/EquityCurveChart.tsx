import React, { useState, useRef } from 'react';
import { Trade } from '../../types/trade';
import { formatCurrency, formatAdaptivePnl } from '../../lib/calculations';

interface EquityCurveProps {
  trades: Trade[];
  initialBalance?: number;
}

export const EquityCurveChart: React.FC<EquityCurveProps> = ({
  trades,
  initialBalance = 100000
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    balance: number;
    pnl: number;
    date: string;
    tradeSymbol: string;
    gainPct: string;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const closed = [...trades]
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime());

  if (closed.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-border rounded-xl">
        <p className="text-sm">No closed trades recorded yet.</p>
        <p className="text-xs text-slate-600 mt-1">Log trades to see your cumulative equity curve.</p>
      </div>
    );
  }

  // Calculate cumulative points with full date formatting
  let current = initialBalance;
  const points: { balance: number; pnl: number; date: string; symbol: string }[] = [
    { balance: initialBalance, pnl: 0, date: 'Account Opened', symbol: 'Base Capital' }
  ];

  closed.forEach(t => {
    current += t.netPnl;
    const tradeDate = new Date(t.closeTime || t.openTime);
    const dateFormatted = tradeDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    points.push({
      balance: current,
      pnl: t.netPnl,
      date: dateFormatted,
      symbol: `${t.symbol} (${t.direction})`
    });
  });

  const balances = points.map(p => p.balance);
  const minBalance = Math.min(...balances) * 0.995;
  const maxBalance = Math.max(...balances) * 1.005;
  const range = maxBalance - minBalance || 1;

  // SVG dimensions
  const width = 800;
  const height = 260;
  const paddingX = 40;
  const paddingY = 25;

  const getX = (index: number) => paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
  const getY = (val: number) => height - paddingY - ((val - minBalance) / range) * (height - paddingY * 2);

  const pathD = points.reduce((acc, p, i) => {
    const x = getX(i);
    const y = getY(p.balance);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${getX(points.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`;

  const isProfitable = current >= initialBalance;

  // Track mouse across the whole chart SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const mouseX = ((clientX - rect.left) / rect.width) * width;

    // Find closest point by X coordinate
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const px = getX(i);
      const dist = Math.abs(px - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    const p = points[closestIdx];
    const gainPct = (((p.balance - initialBalance) / initialBalance) * 100).toFixed(2);
    setHoveredPoint({
      x: getX(closestIdx),
      y: getY(p.balance),
      balance: p.balance,
      pnl: p.pnl,
      date: p.date,
      tradeSymbol: p.symbol,
      gainPct
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Balance Curve</div>
          <div className="text-xl font-extrabold text-white">
            {formatCurrency(current)}
            <span className={`text-xs ml-2 font-medium ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfitable ? '+' : ''}{(((current - initialBalance) / initialBalance) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Balance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-slate-600" />
            <span>Base (${initialBalance.toLocaleString()})</span>
          </div>
        </div>
      </div>

      {/* SVG Chart with Full Cursor Interaction */}
      <div className="w-full relative cursor-crosshair select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 md:h-64 overflow-visible"
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + ratio * (height - paddingY * 2);
            const val = maxBalance - ratio * range;
            return (
              <g key={idx}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <text x={paddingX - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b" className="font-mono">
                  {formatAdaptivePnl(val)}
                </text>
              </g>
            );
          })}

          {/* Starting Balance Line */}
          <line
            x1={paddingX}
            y1={getY(initialBalance)}
            x2={width - paddingX}
            y2={getY(initialBalance)}
            stroke="#475569"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Area Fill */}
          <path d={areaD} fill="url(#equityGrad)" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Vertical Crosshair Line when hovering on a date */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingY}
              x2={hoveredPoint.x}
              y2={height - paddingY}
              stroke="rgba(139, 92, 246, 0.6)"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
          )}

          {/* Regular Points */}
          {points.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.balance);
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={i === points.length - 1 ? 4.5 : 3}
                fill={p.pnl >= 0 ? '#10b981' : '#f43f5e'}
                stroke="#120f24"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Highlighted Cursor Point */}
          {hoveredPoint && (
            <g>
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r={8}
                fill="#8b5cf6"
                fillOpacity="0.25"
                className="animate-ping"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r={5.5}
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Invisible Overlay to Capture all mouse movements */}
          <rect
            x={paddingX}
            y={paddingY}
            width={width - paddingX * 2}
            height={height - paddingY * 2}
            fill="transparent"
          />
        </svg>

        {/* Dynamic High-Contrast Hover Tooltip */}
        {hoveredPoint && (
          <div
            className={`absolute z-30 pointer-events-none bg-surface/95 backdrop-blur-md border border-primary/40 rounded-xl p-3 shadow-2xl text-xs -translate-y-full mb-3 min-w-[170px] ${
              (hoveredPoint.x / width) * 100 > 75 ? '-translate-x-full' : (hoveredPoint.x / width) * 100 < 25 ? 'translate-x-0' : '-translate-x-1/2'
            }`}
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${Math.max((hoveredPoint.y / height) * 100, 25)}%`
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 mb-1.5">
              <span className="font-bold text-white text-[11px] truncate max-w-[120px]">{hoveredPoint.tradeSymbol}</span>
              <span className="text-[10px] font-mono font-medium text-slate-400">{hoveredPoint.date}</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Balance:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(hoveredPoint.balance)}</span>
              </div>
              {hoveredPoint.pnl !== 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Trade P&L:</span>
                  <span className={`font-mono font-bold ${hoveredPoint.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {hoveredPoint.pnl >= 0 ? '+' : ''}{formatCurrency(hoveredPoint.pnl)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Overall Return:</span>
                <span className={`font-mono font-bold ${Number(hoveredPoint.gainPct) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Number(hoveredPoint.gainPct) >= 0 ? '+' : ''}{hoveredPoint.gainPct}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
