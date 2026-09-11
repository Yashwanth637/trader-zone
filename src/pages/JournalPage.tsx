import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/calculations';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText
} from 'lucide-react';

export const JournalPage: React.FC = () => {
  const navigate = useNavigate();
  const { accountTrades, journalEntries } = useTrading();
  
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Days in month
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group closed trades by YYYY-MM-DD
  const dayTradesMap: Record<string, { pnl: number; count: number; wins: number; losses: number }> = {};
  accountTrades.forEach(t => {
    if (t.status === 'CLOSED') {
      const d = (t.closeTime || t.openTime).split('T')[0];
      if (!dayTradesMap[d]) dayTradesMap[d] = { pnl: 0, count: 0, wins: 0, losses: 0 };
      dayTradesMap[d].pnl += t.netPnl;
      dayTradesMap[d].count += 1;
      if (t.netPnl > 0.01) dayTradesMap[d].wins += 1;
      else if (t.netPnl < -0.01) dayTradesMap[d].losses += 1;
    }
  });

  // Calculate month metrics
  let monthPnl = 0;
  let activeDays = 0;
  let profitableDays = 0;
  let losingDays = 0;
  let totalMonthTrades = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const stats = dayTradesMap[dayStr];
    if (stats) {
      monthPnl += stats.pnl;
      activeDays++;
      totalMonthTrades += stats.count;
      if (stats.pnl > 0.01) profitableDays++;
      else if (stats.pnl < -0.01) losingDays++;
    }
  }

  const daysGrid: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push(i);
  }

  return (
    <div className="space-y-6">
      {/* Header and Month Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <span>Trading Journal</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Review daily performance, log reflections, and track consistency on the calendar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={today}>
            Current Month
          </Button>
          <div className="flex items-center gap-1 bg-surface-card border border-border p-1 rounded-xl shadow-sm">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-foreground px-3 font-mono">
              {monthName} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar (3/4) & Month Summary (1/4) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 premium-card p-5">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-muted uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-2">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-24 md:h-28 rounded-xl bg-surface/30 border border-transparent" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayData = dayTradesMap[dateStr];
              const journal = journalEntries.find(j => j.date === dateStr);
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              const isProfitable = dayData && dayData.pnl > 0.01;
              const isLosing = dayData && dayData.pnl < -0.01;

              return (
                <div
                  key={dateStr}
                  onClick={() => navigate(`/day-view?date=${dateStr}`)}
                  className={`h-24 md:h-28 p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] hover:z-10 relative group shadow-sm ${
                    isToday ? 'ring-2 ring-primary' : ''
                  } ${
                    isProfitable
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60'
                      : isLosing
                      ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/60'
                      : dayData
                      ? 'bg-surface border-border hover:border-border-glow'
                      : 'bg-surface/50 border-border hover:border-border-glow'
                  }`}
                >
                  {/* Top: Day number & note icon */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold ${isToday ? 'text-primary font-black' : 'text-muted'}`}>
                      {day}
                    </span>
                    {journal && (
                      <span title="Daily reflection logged" className="text-primary">
                        <FileText className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Middle: Daily P&L */}
                  {dayData ? (
                    <div className="my-auto text-center">
                      <div className={`text-xs md:text-sm font-black font-mono truncate ${
                        isProfitable ? 'text-emerald-500' : isLosing ? 'text-rose-500' : 'text-foreground'
                      }`}>
                        {formatCurrency(dayData.pnl)}
                      </div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">
                        {dayData.wins}W - {dayData.losses}L
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted text-center my-auto hidden md:block opacity-60">
                      No trades
                    </div>
                  )}

                  {/* Bottom: Trades pill */}
                  {dayData ? (
                    <div className="text-[9px] text-center rounded bg-black/10 dark:bg-black/40 text-foreground py-0.5 font-medium">
                      {dayData.count} trade{dayData.count > 1 ? 's' : ''}
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Summary Sidebar */}
        <div className="premium-card p-5 flex flex-col justify-between space-y-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Monthly Recap
            </div>
            <div className="text-xl font-black text-foreground">
              {monthName} {year}
            </div>
          </div>

          {/* Big Monthly P&L */}
          <div className={`p-4 rounded-xl border text-center ${
            monthPnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
          }`}>
            <span className="text-[10px] uppercase font-bold text-muted">Total Net P&L</span>
            <div className={`text-2xl font-black font-mono mt-1 ${monthPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(monthPnl)}
            </div>
          </div>

          {/* Metrics breakdown */}
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted">Active Trading Days:</span>
              <span className="font-mono font-bold text-foreground">{activeDays} Days</span>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted">Green / Red Days:</span>
              <span className="font-mono font-bold">
                <span className="text-emerald-500">{profitableDays}W</span> / <span className="text-rose-500">{losingDays}L</span>
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted">Day Win Rate:</span>
              <span className="font-mono font-bold text-foreground">
                {activeDays > 0 ? `${Math.round((profitableDays / activeDays) * 100)}%` : '0%'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted">Total Month Trades:</span>
              <span className="font-mono font-bold text-foreground">{totalMonthTrades}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted">Avg Daily P&L:</span>
              <span className="font-mono font-bold text-foreground">
                {activeDays > 0 ? formatCurrency(monthPnl / activeDays) : '$0.00'}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate(`/day-view?date=${new Date().toISOString().split('T')[0]}`)}
          >
            Review Today's Journal
          </Button>
        </div>
      </div>
    </div>
  );
};
