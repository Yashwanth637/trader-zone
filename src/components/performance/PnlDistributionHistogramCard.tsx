import React, { useState, useRef } from 'react';
import { PnlDistributionHistogramData, PnlHistogramBin } from '../../lib/performanceAnalytics';
import { formatAdaptivePnl, formatCurrency } from '../../lib/calculations';
import { BarChart2, Info, AlertCircle } from 'lucide-react';

interface PnlDistributionHistogramCardProps {
  data: PnlDistributionHistogramData;
}

export const PnlDistributionHistogramCard: React.FC<PnlDistributionHistogramCardProps> = ({ data }) => {
  const { bins, maxCount, yTicks, totalTrades, hasData } = data;
  const [hoveredBin, setHoveredBin] = useState<{
    bin: PnlHistogramBin;
    x: number;
    y: number;
  } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  if (!hasData || bins.length === 0) {
    return (
      <div className="premium-card p-6 flex flex-col justify-between min-h-[380px]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <BarChart2 className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">P&L Distribution</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted text-xs border border-dashed border-border rounded-xl p-8">
          <AlertCircle className="w-6 h-6 mb-2 opacity-50 text-muted" />
          <span>No closed trades available to calculate P&L distribution.</span>
        </div>
      </div>
    );
  }

  // SVG Chart Geometry
  const width = 520;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const barCount = bins.length;
  const slotWidth = chartWidth / barCount;
  const barWidth = Math.max(6, Math.min(28, slotWidth * 0.72));

  return (
    <div className="premium-card p-6 flex flex-col justify-between relative select-none h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm">
              <BarChart2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">P&L Distribution</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted font-mono">
              {totalTrades} closed {totalTrades === 1 ? 'trade' : 'trades'}
            </span>
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
                  Frequency distribution showing how your trade profits and losses cluster across different dollar ranges.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SVG Histogram Chart */}
        <div className="w-full relative mt-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-56 overflow-visible"
            onMouseLeave={() => setHoveredBin(null)}
          >
            {/* Horizontal Grid lines & Y-axis labels */}
            {yTicks.map((tickVal, idx) => {
              const y = paddingTop + chartHeight - (maxCount > 0 ? (tickVal / maxCount) * chartHeight : 0);
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={idx === 0 ? "0.2" : "0.08"}
                    strokeDasharray={idx === 0 ? "none" : "3 3"}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    className="fill-muted font-mono"
                  >
                    {Math.round(tickVal)}
                  </text>
                </g>
              );
            })}

            {/* Vertical Y-axis baseline */}
            <line
              x1={paddingLeft}
              y1={paddingTop}
              x2={paddingLeft}
              y2={paddingTop + chartHeight}
              stroke="currentColor"
              strokeOpacity="0.2"
            />

            {/* Histogram Bars */}
            {bins.map((bin, idx) => {
              const xCenter = paddingLeft + (idx + 0.5) * slotWidth;
              const x = xCenter - barWidth / 2;
              const barHeight = maxCount > 0 && bin.count > 0
                ? Math.max(4, (bin.count / maxCount) * chartHeight)
                : 0;
              const y = paddingTop + chartHeight - barHeight;
              const isHovered = hoveredBin?.bin.binIndex === bin.binIndex;

              const barColor = bin.isPositive ? '#10b981' : '#f43f5e';

              return (
                <g
                  key={bin.binIndex}
                  className="cursor-pointer transition-opacity duration-150"
                  onMouseEnter={() => {
                    setHoveredBin({
                      bin,
                      x: xCenter,
                      y
                    });
                  }}
                >
                  {/* Interactive invisible hover hit area */}
                  <rect
                    x={paddingLeft + idx * slotWidth}
                    y={paddingTop}
                    width={slotWidth}
                    height={chartHeight}
                    fill="transparent"
                  />

                  {/* Visible Bar */}
                  {bin.count > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="3"
                      fill={barColor}
                      opacity={isHovered ? 1 : 0.88}
                      className="transition-all duration-150"
                      style={
                        isHovered
                          ? { filter: `drop-shadow(0 0 6px ${barColor})` }
                          : undefined
                      }
                    />
                  )}

                  {/* X-axis Bin Label */}
                  <text
                    x={xCenter}
                    y={paddingTop + chartHeight + 16}
                    textAnchor="middle"
                    fontSize="9"
                    className={`font-mono transition-colors ${
                      isHovered ? 'fill-foreground font-bold' : 'fill-muted'
                    }`}
                  >
                    {formatAdaptivePnl(bin.midpoint)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Floating Hover Tooltip */}
          {hoveredBin && (
            <div
              className="absolute pointer-events-none transition-all duration-75 z-30 p-2.5 rounded-xl bg-surface-card border border-border shadow-xl backdrop-blur-md text-left text-xs min-w-[150px]"
              style={{
                left: `${Math.max(10, Math.min(85, (hoveredBin.x / width) * 100))}%`,
                top: `${Math.max(10, Math.min(65, (hoveredBin.y / height) * 100))}%`,
                transform: 'translate(-50%, -105%)'
              }}
            >
              <div className="text-[10px] text-muted mb-1 font-mono">
                Range: {formatAdaptivePnl(hoveredBin.bin.min)} to {formatAdaptivePnl(hoveredBin.bin.max)}
              </div>
              <div className="text-foreground font-bold flex items-center justify-between gap-3">
                <span>Trades:</span>
                <span className="font-mono text-sm">
                  {hoveredBin.bin.count}{' '}
                  <span className="text-[10px] text-muted font-normal">
                    ({hoveredBin.bin.percentage}%)
                  </span>
                </span>
              </div>
              {hoveredBin.bin.count > 0 && (
                <div className="text-muted text-[10px] mt-1 pt-1 border-t border-border flex items-center justify-between">
                  <span>Net P&L:</span>
                  <span
                    className={`font-mono font-bold ${
                      hoveredBin.bin.isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {hoveredBin.bin.isPositive ? '+' : ''}
                    {formatCurrency(hoveredBin.bin.totalPnlInBin)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
