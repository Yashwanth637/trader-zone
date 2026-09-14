import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { calculateDayViewData, generateMonthCalendar, DayPerformanceCardData } from '../lib/dayViewAnalytics';
import { formatCurrency, formatAdaptivePnl } from '../lib/calculations';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Play,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Plus
} from 'lucide-react';

export const DayViewPage: React.FC<{ onOpenAddTrade: () => void }> = ({ onOpenAddTrade }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accountTrades } = useTrading();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Compute all day performance data
  const { daysMap, allDateKeys } = useMemo(() => calculateDayViewData(accountTrades), [accountTrades]);

  // Initial active date
  const defaultDateKey = useMemo(() => {
    const urlDate = searchParams.get('date');
    if (urlDate && daysMap[urlDate]) return urlDate;
    if (allDateKeys.length > 0) return allDateKeys[0];
    return new Date().toISOString().split('T')[0];
  }, [searchParams, daysMap, allDateKeys]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDateKey);

  // Calendar Year & Month state
  const defaultYearMonth = useMemo(() => {
    const d = new Date(defaultDateKey + 'T00:00:00');
    return isNaN(d.getTime())
      ? { year: new Date().getFullYear(), month: new Date().getMonth() }
      : { year: d.getFullYear(), month: d.getMonth() };
  }, [defaultDateKey]);

  const [calYear, setCalYear] = useState<number>(defaultYearMonth.year);
  const [calMonth, setCalMonth] = useState<number>(defaultYearMonth.month); // 0-11

  // Accordion expansion state: set of dateKeys
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set([defaultDateKey]));

  // Ensure selectedDate is expanded when user clicks calendar
  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setExpandedDates(prev => {
      const next = new Set(prev);
      next.add(dateKey);
      return next;
    });

    // Smooth scroll to selected day card
    setTimeout(() => {
      const el = document.getElementById(`day-card-${dateKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const toggleExpand = (dateKey: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedDates(new Set(allDateKeys));
  };

  const handleCollapseAll = () => {
    setExpandedDates(new Set());
  };

  // Calendar navigation
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear(y => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear(y => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  // Month name formatting
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarCells = useMemo(() => {
    return generateMonthCalendar(calYear, calMonth, daysMap);
  }, [calYear, calMonth, daysMap]);

  // Days to display on left: either all dates, or filtered to calendar month
  const visibleDayKeys = useMemo(() => {
    if (allDateKeys.length === 0) return [];
    // Prioritize days in current calendar month, or if none, show all available days
    const inCurrentCal = allDateKeys.filter(k => {
      const [y, m] = k.split('-').map(Number);
      return y === calYear && m === calMonth + 1;
    });
    return inCurrentCal.length > 0 ? inCurrentCal : allDateKeys;
  }, [allDateKeys, calYear, calMonth]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <span>Day View</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Review your trading performance day by day
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-sm"
          >
            Collapse all
          </button>
          <button
            onClick={handleExpandAll}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-sm"
          >
            Expand all
          </button>
        </div>
      </div>

      {/* Main Grid: Left Day Cards (8 cols) & Right Calendar Navigator (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================
            LEFT COLUMN: Collapsible Day Cards (lg:col-span-8)
           ========================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {visibleDayKeys.length === 0 ? (
            <div className="premium-card p-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Trades Logged for this Period</h3>
              <p className="text-xs text-muted max-w-sm">
                There are no recorded trade executions for {monthNames[calMonth]} {calYear}. Switch months or log new trades to see daily breakdowns.
              </p>
              <button
                onClick={onOpenAddTrade}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary-hover flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Trade</span>
              </button>
            </div>
          ) : (
            visibleDayKeys.map(dateKey => {
              const dayData = daysMap[dateKey];
              if (!dayData) return null;
              const isExpanded = expandedDates.has(dateKey);
              const isPos = dayData.netPnl >= 0;

              return (
                <div
                  key={dateKey}
                  id={`day-card-${dateKey}`}
                  className="premium-card overflow-hidden transition-all duration-300"
                >
                  {/* Card Header (Accordion toggle + Date title + Net PnL + Replay) */}
                  <div className="p-5 flex items-center justify-between gap-4 border-b border-border/60">
                    <div
                      onClick={() => toggleExpand(dateKey)}
                      className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                      <button
                        type="button"
                        className="w-6 h-6 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted group-hover:text-foreground transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div>
                        <div className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {dayData.dateTitle}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-mono font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                            Net P&L {isPos ? `+$${dayData.netPnl.toFixed(2)}` : `-$${Math.abs(dayData.netPnl).toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Replay Button */}
                    <button
                      onClick={() => {
                        if (dayData.trades[0]) {
                          navigate(`/replay?tradeId=${dayData.trades[0].id}`);
                        } else {
                          navigate('/replay');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-border/80 hover:border-border text-xs font-semibold text-foreground flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-sm"
                    >
                      <Play className="w-3 h-3 fill-current text-primary" />
                      <span>Replay</span>
                    </button>
                  </div>

                  {/* Collapsible Content */}
                  {isExpanded && (
                    <div className="p-6 space-y-6">
                      
                      {/* 1. Intraday Cumulative P&L Area / Line Chart */}
                      <IntradayPnlChart progression={dayData.intradayProgression} isProfitable={isPos} />

                      {/* 2. Key Daily Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-2 pt-2 border-t border-border/40">
                        {/* Total Trades */}
                        <div>
                          <div className="text-[11px] text-muted font-medium">Total Trades</div>
                          <div className="text-xl font-mono font-bold text-foreground mt-0.5">
                            {dayData.totalTrades}
                          </div>
                        </div>

                        {/* Win Rate */}
                        <div>
                          <div className="text-[11px] text-muted font-medium">Win Rate</div>
                          <div className="text-xl font-mono font-bold text-foreground mt-0.5">
                            {dayData.winRate.toFixed(1)}%
                          </div>
                        </div>

                        {/* Gross P&L */}
                        <div>
                          <div className="text-[11px] text-muted font-medium">Gross P&L</div>
                          <div className={`text-xl font-mono font-bold mt-0.5 ${dayData.grossPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {dayData.grossPnl >= 0 ? '+' : ''}${dayData.grossPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Winners / Losers */}
                        <div>
                          <div className="text-[11px] text-muted font-medium">Winners / Losers</div>
                          <div className="text-xl font-mono font-bold text-foreground mt-0.5">
                            {dayData.winnersCount} / {dayData.losersCount}
                          </div>
                        </div>

                        {/* Volume */}
                        <div>
                          <div className="text-[11px] text-muted font-medium">Volume</div>
                          <div className="text-xl font-mono font-bold text-foreground mt-0.5">
                            {dayData.volume.toFixed(2)}
                          </div>
                        </div>

                        {/* Profit Factor */}
                        <div>
                          <div className="text-[11px] text-muted font-medium">Profit Factor</div>
                          <div className="text-xl font-mono font-bold text-foreground mt-0.5">
                            {dayData.profitFactor.toFixed(2)}
                          </div>
                        </div>

                        {/* Commissions */}
                        <div>
                          <div className="text-[11px] text-muted font-medium">Commissions</div>
                          <div className="text-xl font-mono font-bold text-foreground mt-0.5">
                            ${dayData.commissions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {/* 3. Executions Table */}
                      <div className="pt-2 border-t border-border/40">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-border/60 text-muted font-medium">
                                <th className="pb-2.5 font-semibold">Open Time</th>
                                <th className="pb-2.5 font-semibold">Symbol</th>
                                <th className="pb-2.5 font-semibold">Side</th>
                                <th className="pb-2.5 font-semibold">Quantity</th>
                                <th className="pb-2.5 font-semibold">Net P&L</th>
                                <th className="pb-2.5 text-right font-semibold">Replay</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {dayData.trades.map(trade => (
                                <tr key={trade.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                  {/* Open Time */}
                                  <td className="py-3 font-mono text-muted">
                                    {trade.openTimeFormatted}
                                  </td>

                                  {/* Symbol */}
                                  <td className="py-3 font-bold text-foreground">
                                    {trade.symbol}
                                  </td>

                                  {/* Side Badge */}
                                  <td className="py-3">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold lowercase ${
                                      trade.side === 'long'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    }`}>
                                      {trade.side}
                                    </span>
                                  </td>

                                  {/* Quantity */}
                                  <td className="py-3 font-mono text-foreground">
                                    {trade.quantity}
                                  </td>

                                  {/* Net PnL */}
                                  <td className="py-3 font-mono font-bold">
                                    <span className={trade.isWin ? 'text-emerald-500' : 'text-rose-500'}>
                                      {trade.isWin ? `+$${trade.netPnl.toFixed(2)}` : `-$${Math.abs(trade.netPnl).toFixed(2)}`}
                                    </span>
                                  </td>

                                  {/* Replay Link */}
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => navigate(`/replay?tradeId=${trade.id}`)}
                                      className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                      title="Replay this trade"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* =========================================================
            RIGHT COLUMN: Interactive Calendar Navigator (lg:col-span-4)
           ========================================================= */}
        <div className="lg:col-span-4 sticky top-6">
          <div className="premium-card p-5 space-y-4">
            {/* Month & Year Navigation Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                {monthNames[calMonth]} {calYear}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.dateKey === selectedDate;
                const isWin = cell.status === 'win';
                const isLoss = cell.status === 'loss';

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cell.isCurrentMonth && cell.hasTrades) {
                        handleSelectDate(cell.dateKey);
                      }
                    }}
                    className={`h-9 flex items-center justify-center rounded-lg transition-all select-none font-mono ${
                      !cell.isCurrentMonth
                        ? 'text-muted/30 pointer-events-none'
                        : cell.hasTrades
                          ? 'cursor-pointer font-bold'
                          : 'text-muted/70 hover:text-foreground'
                    } ${
                      // Style matching image 1:
                      // Green box for win day (like 2 in image)
                      isWin && !isSelected ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : ''
                    } ${
                      // Red box for loss day
                      isLoss && !isSelected ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30' : ''
                    } ${
                      // Selected date: prominent purple border ring (like 4 in image!)
                      isSelected
                        ? 'border-2 border-violet-500 text-violet-300 font-black shadow-md shadow-violet-500/20 bg-violet-500/10'
                        : ''
                    }`}
                    title={cell.hasTrades ? `${cell.dateKey}: ${cell.netPnl >= 0 ? `+$${cell.netPnl.toFixed(2)}` : `-$${Math.abs(cell.netPnl).toFixed(2)}`}` : undefined}
                  >
                    {cell.dayNum}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

/**
 * Intraday Cumulative P&L Area / Line Chart
 */
const IntradayPnlChart: React.FC<{
  progression: { time: string; pnl: number }[];
  isProfitable: boolean;
}> = ({ progression, isProfitable }) => {
  if (progression.length === 0) return null;

  // Prepend market open $0 point so the intraday curve always displays the progression from 0
  const points = progression[0]?.time === 'Open'
    ? progression
    : [{ time: 'Open', pnl: 0 }, ...progression];

  // Chart dimensions
  const svgW = 600;
  const svgH = 140;
  const padLeft = 65;
  const padRight = 25;
  const padTop = 18;
  const padBottom = 28;

  const pnls = points.map(p => p.pnl);
  const rawMin = Math.min(...pnls);
  const rawMax = Math.max(...pnls);
  const rawRange = rawMax - rawMin;

  // Dynamic adaptive margin so the curve is prominent even for cent changes (e.g. $0.24 or $0.36)
  const margin = Math.max(0.1, rawRange * 0.25);
  const chartMin = rawMin - margin;
  const chartMax = rawMax + margin;
  const range = (chartMax - chartMin) || 1;

  const getX = (idx: number) => {
    if (points.length <= 1) return padLeft + (svgW - padLeft - padRight) / 2;
    return padLeft + (idx / (points.length - 1)) * (svgW - padLeft - padRight);
  };

  const getY = (val: number) => {
    return svgH - padBottom - ((val - chartMin) / range) * (svgH - padTop - padBottom);
  };

  const zeroY = getY(0);

  const pathD = points.reduce((acc, p, i) => {
    const x = getX(i);
    const y = getY(p.pnl);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${getX(points.length - 1)} ${svgH - padBottom} L ${getX(0)} ${svgH - padBottom} Z`;

  const strokeColor = isProfitable ? '#10b981' : '#ef4444';
  const gradId = `intradayGrad-${isProfitable ? 'win' : 'loss'}`;

  const yTicks = [chartMax, (chartMax + chartMin) / 2, chartMin];

  return (
    <div className="w-full relative py-1">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-36 select-none overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
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
                strokeOpacity="0.08"
                strokeDasharray="2 2"
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

        {/* Zero baseline */}
        <line
          x1={padLeft}
          y1={zeroY}
          x2={svgW - padRight}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="1"
          strokeDasharray="3 3"
          className="text-foreground"
        />

        {/* Area gradient fill */}
        <path d={areaD} fill={`url(#${gradId})`} />

        {/* Progression line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Point nodes and labels */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={getX(idx)}
              cy={getY(p.pnl)}
              r="4"
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x={getX(idx)}
              y={svgH - padBottom + 16}
              textAnchor="middle"
              className="text-[9px] font-mono fill-muted"
            >
              {p.time}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
