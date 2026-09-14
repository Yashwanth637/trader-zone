import React from 'react';
import { SymbolPerformanceData } from '../../lib/performanceAnalytics';
import { Target, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface SymbolPerformanceCardProps {
  data: SymbolPerformanceData;
}

export const SymbolPerformanceCard: React.FC<SymbolPerformanceCardProps> = ({ data }) => {
  const { symbolsTradedCount, bestSymbol, mostTradedSymbol, worstSymbol, symbols } = data;

  // Distinct color palette for trade distribution pie chart
  const pieColors = ['#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];

  // Calculate Pie Chart Slices
  const totalTrades = symbols.reduce((s, item) => s + item.totalTrades, 0);
  let cumulativeAngle = 0;
  const pieSlices = symbols.map((item, idx) => {
    const share = totalTrades > 0 ? item.totalTrades / totalTrades : 1 / Math.max(1, symbols.length);
    const angle = share * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    // Convert angles to SVG arc coordinates (cx: 100, cy: 100, r: 80)
    const r = 78;
    const cx = 100;
    const cy = 100;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const pathD = totalTrades > 0 && symbols.length > 1
      ? `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
      : `M ${cx - r} ${cy} a ${r} ${r} 0 1,0 ${r * 2} 0 a ${r} ${r} 0 1,0 -${r * 2} 0`;

    return {
      symbol: item.symbol,
      sharePct: item.sharePct,
      color: pieColors[idx % pieColors.length],
      pathD
    };
  });

  // Calculate P&L Horizontal Bars scale
  const pnls = symbols.map(s => s.netPnl);
  const maxAbsPnl = Math.max(1000, ...pnls.map(p => Math.abs(p)));
  const scaleLimit = Math.ceil(maxAbsPnl / 11000) * 11000 || 22000;

  return (
    <div className="premium-card p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Symbol Performance
            </h2>
            <p className="text-xs text-muted">P&L breakdown by symbol</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted font-medium">Symbols Traded</div>
          <div className="text-2xl font-mono font-black text-foreground">
            {symbolsTradedCount}
          </div>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Best */}
        <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Best</span>
          </div>
          <div className="text-base font-bold text-foreground mt-1">
            {bestSymbol ? bestSymbol.symbol : 'None'}
          </div>
          <div className="text-sm font-mono font-bold text-emerald-500 mt-0.5">
            {bestSymbol && bestSymbol.netPnl > 0
              ? `+$${bestSymbol.netPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '$0.00'}
          </div>
        </div>

        {/* Most Traded */}
        <div className="p-4 rounded-xl border border-violet-500/25 bg-violet-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-violet-400 font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>Most Traded</span>
          </div>
          <div className="text-base font-bold text-foreground mt-1">
            {mostTradedSymbol ? mostTradedSymbol.symbol : 'None'}
          </div>
          <div className="text-sm font-mono text-muted mt-0.5">
            {mostTradedSymbol ? `${mostTradedSymbol.tradeCount} trades` : '0 trades'}
          </div>
        </div>

        {/* Worst */}
        <div className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Worst</span>
          </div>
          <div className="text-base font-bold text-foreground mt-1">
            {worstSymbol ? worstSymbol.symbol : 'None'}
          </div>
          <div className="text-sm font-mono font-bold text-rose-500 mt-0.5">
            {worstSymbol
              ? `-$${Math.abs(worstSymbol.netPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '$0.00'}
          </div>
        </div>
      </div>

      {/* Middle Row: P&L by Symbol (Left) & Trade Distribution (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pt-2">
        {/* Left: Horizontal Bidirectional Bars */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-muted uppercase tracking-wider">
            P&L by Symbol
          </div>

          <div className="space-y-3.5 pt-2">
            {symbols.map(item => {
              const isPos = item.netPnl >= 0;
              const widthPct = Math.min(100, (Math.abs(item.netPnl) / scaleLimit) * 100);

              return (
                <div key={item.symbol} className="flex items-center text-xs">
                  {/* Symbol Label */}
                  <span className="w-20 font-bold text-foreground shrink-0">
                    {item.symbol}
                  </span>

                  {/* Bidirectional bar container */}
                  <div className="relative flex-1 h-6 flex items-center">
                    {/* Centered zero line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-border z-10" />

                    {/* Negative Left side */}
                    <div className="w-1/2 h-full flex items-center justify-end pr-[1px]">
                      {!isPos && (
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-5 bg-rose-500 rounded-l-md transition-all duration-500"
                          title={`${item.symbol}: -$${Math.abs(item.netPnl).toLocaleString()}`}
                        />
                      )}
                    </div>

                    {/* Positive Right side */}
                    <div className="w-1/2 h-full flex items-center justify-start pl-[1px]">
                      {isPos && (
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-5 bg-emerald-500 rounded-r-md transition-all duration-500"
                          title={`${item.symbol}: +$${item.netPnl.toLocaleString()}`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scale Ticks */}
          <div className="flex items-center justify-between text-[10px] font-mono text-muted pt-3 pl-20 border-t border-border/40">
            <span>-${scaleLimit.toLocaleString()}</span>
            <span>$0.00</span>
            <span>+${(scaleLimit * 0.5).toLocaleString()}</span>
            <span>+${scaleLimit.toLocaleString()}</span>
          </div>
        </div>

        {/* Right: Trade Distribution Pie Chart & Legend */}
        <div className="space-y-3 flex flex-col items-center">
          <div className="text-xs font-bold text-muted uppercase tracking-wider w-full text-left">
            Trade Distribution
          </div>

          {/* SVG Pie Chart */}
          <div className="py-2">
            <svg viewBox="0 0 200 200" className="w-48 h-48 select-none">
              {pieSlices.map((slice, idx) => (
                <path
                  key={idx}
                  d={slice.pathD}
                  fill={slice.color}
                  stroke="#0b0b0e"
                  strokeWidth="1.5"
                  className="transition-all duration-300 hover:opacity-90"
                />
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 text-xs text-muted font-medium">
            {pieSlices.map(slice => (
              <div key={slice.symbol} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="font-mono text-foreground">{slice.symbol} ({slice.sharePct}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom List: All Symbols */}
      <div className="pt-4 border-t border-border/60 space-y-3">
        <div className="text-xs font-bold text-muted uppercase tracking-wider">
          All Symbols
        </div>

        <div className="space-y-2.5">
          {symbols.map(item => {
            const isPos = item.netPnl >= 0;

            return (
              <div
                key={item.symbol}
                className="flex items-center justify-between p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/60 hover:border-border transition-colors"
              >
                {/* Left: Avatar & Symbol Name & Record */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isPos ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  }`}>
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {item.symbol}
                    </div>
                    <div className="text-xs text-muted font-mono mt-0.5">
                      {item.winningTrades}W / {item.losingTrades}L · {item.winRate}% WR
                    </div>
                  </div>
                </div>

                {/* Right: Net P&L and Trade Count */}
                <div className="text-right">
                  <div className={`text-sm font-mono font-bold ${
                    isPos ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {isPos ? '+' : ''}${item.netPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted font-mono mt-0.5">
                    {item.totalTrades} {item.totalTrades === 1 ? 'trade' : 'trades'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
