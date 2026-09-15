import React, { useState, useRef } from 'react';
import { DrawdownAnalysisData } from '../../lib/performanceAnalytics';
import { formatCurrency, formatAdaptivePnl } from '../../lib/calculations';
import { TrendingDown, AlertCircle } from 'lucide-react';

interface DrawdownAnalysisCardProps {
  data: DrawdownAnalysisData;
}

export const DrawdownAnalysisCard: React.FC<DrawdownAnalysisCardProps> = ({ data }) => {
  const { points, maxDrawdownUsd, maxDrawdownPct, maxDrawdownDate, hasData } = data;
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    point: typeof points[0];
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  if (!hasData || points.length === 0) {
    return (
      <div className="premium-card p-6 flex flex-col justify-between min-h-[420px]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
            <TrendingDown className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Drawdown Analysis</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted text-xs border border-dashed border-border rounded-xl p-8">
          <AlertCircle className="w-6 h-6 mb-2 opacity-50 text-muted" />
          <span>No drawdown records available yet. Closed trades will generate the drawdown curve.</span>
        </div>
      </div>
    );
  }

  // SVG Geometry Settings
  const width = 520;
  const height = 230;
  const paddingLeft = 70;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Adaptive headroom on max drawdown to ensure curve always has prominent dips & contours
  const calculateDynamicScaleLimit = (maxDd: number): number => {
    if (maxDd <= 0) return 50;
    const raw = maxDd * 1.25; // 25% headroom
    if (raw <= 10) return 10;
    if (raw <= 25) return 25;
    if (raw <= 50) return 50;
    if (raw <= 100) return 100;
    if (raw <= 250) return 250;
    if (raw <= 500) return 500;
    if (raw <= 1000) return 1000;
    if (raw <= 2500) return 2500;
    if (raw <= 5000) return 5000;
    if (raw <= 10000) return 10000;
    if (raw <= 25000) return 25000;
    if (raw <= 50000) return 50000;
    if (raw <= 100000) return 100000;
    return Math.ceil(raw / 25000) * 25000;
  };

  const maxScaleLimit = calculateDynamicScaleLimit(maxDrawdownUsd);

  // Y-axis tick values (0 at top, increasing drawdown downwards)
  const tickSteps = 4;
  const yTicks = Array.from({ length: tickSteps + 1 }, (_, i) => {
    return (maxScaleLimit / tickSteps) * i;
  });

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (drawdownUsd: number) => {
    // 0 drawdown is at paddingTop (top)
    // maxScaleLimit is at paddingTop + chartHeight (bottom)
    const ratio = Math.min(1, Math.max(0, drawdownUsd / (maxScaleLimit || 1)));
    return paddingTop + ratio * chartHeight;
  };

  // Build SVG Path
  const linePoints = points.map((p, i) => ({
    x: getX(i),
    y: getY(p.drawdownUsd)
  }));

  const pathD = linePoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Fill down from zero line to the curve
  const firstX = linePoints[0]?.x || paddingLeft;
  const lastX = linePoints[linePoints.length - 1]?.x || width - paddingRight;
  const areaD = `${pathD} L ${lastX} ${paddingTop} L ${firstX} ${paddingTop} Z`;

  // X-axis label selection (sample 5 to 7 dates)
  const sampleCount = Math.min(points.length, 7);
  const step = Math.max(1, Math.floor((points.length - 1) / (sampleCount - 1 || 1)));
  const xLabels = [];
  for (let i = 0; i < points.length; i += step) {
    xLabels.push({ index: i, point: points[i] });
  }
  if (xLabels[xLabels.length - 1]?.index !== points.length - 1 && points.length > 1) {
    xLabels.push({ index: points.length - 1, point: points[points.length - 1] });
  }

  // Handle Mouse Movement for Crosshair & Tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const svgX = ((clientX - rect.left) / rect.width) * width;

    // Find closest point by X coordinate
    let closestIndex = 0;
    let closestDist = Infinity;

    points.forEach((_, i) => {
      const px = getX(i);
      const dist = Math.abs(px - svgX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });

    const targetPoint = points[closestIndex];
    if (targetPoint) {
      setHoveredPoint({
        x: getX(closestIndex),
        y: getY(targetPoint.drawdownUsd),
        point: targetPoint
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="premium-card p-6 flex flex-col justify-between relative select-none">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-sm">
          <TrendingDown className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-foreground tracking-tight">Drawdown Analysis</h2>
      </div>

      {/* Interactive SVG Chart Container */}
      <div className="w-full relative mt-1 cursor-crosshair">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-52 overflow-visible"
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#f43f5e" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis labels */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  className="fill-muted font-mono"
                >
                  {val === 0 ? formatAdaptivePnl(0) : `-${formatAdaptivePnl(val)}`}
                </text>
              </g>
            );
          })}

          {/* Peak Equity Notification if 0 Drawdown */}
          {maxDrawdownUsd === 0 && (
            <text
              x={paddingLeft + chartWidth / 2}
              y={paddingTop + chartHeight / 2}
              textAnchor="middle"
              className="fill-emerald-400/70 text-xs font-semibold"
              fontSize="12"
            >
              ★ Peak Equity — 0 Drawdown Recorded
            </text>
          )}

          {/* Zero Top Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={width - paddingRight}
            y2={paddingTop}
            stroke="#f43f5e"
            strokeOpacity="0.3"
            strokeWidth="1"
          />

          {/* Drawdown Area Gradient Fill */}
          <path d={areaD} fill="url(#drawdownGradient)" />

          {/* Drawdown Red Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X-axis Date Labels */}
          {xLabels.map((lbl, idx) => {
            const x = getX(lbl.index);
            return (
              <text
                key={idx}
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                className="fill-muted font-mono"
              >
                {lbl.point.date}
              </text>
            );
          })}

          {/* Hover Crosshair & Point */}
          {hoveredPoint && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={height - paddingBottom}
                stroke="#ffffff"
                strokeOpacity="0.5"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />

              {/* Glowing Indicator Dot */}
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6"
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Box matching image */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none transition-all duration-75 z-30 p-2.5 rounded-xl bg-surface-card border border-border shadow-xl backdrop-blur-md text-left text-xs min-w-[140px]"
            style={{
              left: `${Math.max(10, Math.min(80, (hoveredPoint.x / width) * 100))}%`,
              top: `${Math.max(15, Math.min(55, (hoveredPoint.y / height) * 100))}%`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-bold text-foreground text-[11px] mb-0.5">
              {hoveredPoint.point.fullDate || hoveredPoint.point.date}
            </div>
            <div className="text-[10px] text-muted">
              drawdown: <strong className="font-mono text-rose-500 font-bold">-{formatCurrency(hoveredPoint.point.drawdownUsd)}</strong>
            </div>
            {hoveredPoint.point.drawdownPct > 0 && (
              <div className="text-[10px] text-muted mt-0.5">
                depth: <strong className="font-mono text-rose-400">-{hoveredPoint.point.drawdownPct}%</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Summary Cards Row (3 Subcards) */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border">
        <div className="p-3 rounded-xl bg-surface-card/60 border border-border">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Max Drawdown</div>
          <div className="text-lg font-black font-mono text-rose-500 mt-1 truncate">
            -{formatCurrency(maxDrawdownUsd)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-card/60 border border-border">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Max DD %</div>
          <div className="text-lg font-black font-mono text-rose-500 mt-1 truncate">
            -{maxDrawdownPct.toFixed(1)}%
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-card/60 border border-border">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Date</div>
          <div className="text-lg font-bold text-foreground mt-1 truncate">
            {maxDrawdownDate || '-'}
          </div>
        </div>
      </div>
    </div>
  );
};
