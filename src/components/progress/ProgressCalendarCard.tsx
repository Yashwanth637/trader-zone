import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Trade } from '../../types/trade';
import { DailyJournalEntry } from '../../types/journal';
import {
  getMonthCalendarDays,
  ProgressRuleConfig,
  CalendarDayCompliance
} from '../../lib/progressTrackerAnalytics';

interface ProgressCalendarCardProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  trades: Trade[];
  journalEntries: DailyJournalEntry[];
  config: ProgressRuleConfig;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ProgressCalendarCard: React.FC<ProgressCalendarCardProps> = ({
  selectedDate,
  onSelectDate,
  trades,
  journalEntries,
  config,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  // Initial year/month from selectedDate or today
  const [viewYear, setViewYear] = useState<number>(() => {
    if (selectedDate) {
      const y = parseInt(selectedDate.split('-')[0], 10);
      if (!isNaN(y)) return y;
    }
    return today.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (selectedDate) {
      const m = parseInt(selectedDate.split('-')[1], 10);
      if (!isNaN(m)) return m;
    }
    return today.getMonth() + 1;
  });

  const monthName = useMemo(() => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    return d.toLocaleString('en-US', { month: 'long' });
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(y => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(y => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleGoToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    onSelectDate(todayStr);
  };

  // Generate calendar days for current viewMonth
  const calendarDays = useMemo(() => {
    return getMonthCalendarDays(viewYear, viewMonth, trades, journalEntries, config);
  }, [viewYear, viewMonth, trades, journalEntries, config]);

  return (
    <div className="bg-white dark:bg-[#12131a] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg md:text-xl font-bold text-foreground">
          Progress Tracker
        </h3>
        <button
          onClick={handleGoToday}
          className="text-sm font-semibold text-indigo-600 dark:text-[#818cf8] hover:text-indigo-500 dark:hover:text-[#a5b4fc] transition-colors"
        >
          Today
        </button>
      </div>

      {/* Month Navigator Header */}
      <div className="flex items-center justify-between mt-6 px-2">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Previous Month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-base font-bold text-foreground tracking-wide">
          {monthName} {viewYear}
        </div>

        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Next Month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 gap-2 md:gap-3 mt-5 mb-2 text-center">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-xs font-medium text-zinc-500 dark:text-zinc-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 md:gap-3">
        {calendarDays.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return (
              <div
                key={`empty-${idx}`}
                className="h-16 md:h-20 rounded-2xl opacity-0 pointer-events-none"
              />
            );
          }

          const isSelected = cell.date === selectedDate;
          const isTodayCell = cell.date === todayStr;

          // Determine cell background styling based on compliance score
          let cellStyle = 'bg-transparent text-zinc-700 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/[0.04] border border-transparent';
          if (cell.isTradingDay && cell.complianceScore !== null) {
            if (cell.complianceScore >= 80) {
              cellStyle = 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-500/20 dark:hover:bg-emerald-950/60';
            } else if (cell.complianceScore >= 50) {
              cellStyle = 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-500/20 dark:hover:bg-amber-950/60';
            } else {
              // Burgundy/Red for low compliance (< 50%), matching cell 4 in Image 1
              cellStyle = 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 dark:bg-[#3b181c] dark:text-red-200 dark:border-red-500/25 dark:hover:bg-[#4a1f24]';
            }
          }

          return (
            <div
              key={cell.date}
              onClick={() => onSelectDate(cell.date)}
              className={`h-16 md:h-20 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative select-none ${cellStyle} ${
                isSelected
                  ? 'border-2 !border-indigo-500 dark:!border-[#818cf8] shadow-[0_0_15px_rgba(129,140,248,0.25)] ring-1 ring-purple-500/40'
                  : ''
              }`}
              title={
                cell.isTradingDay
                  ? `${cell.date}: Compliance ${cell.complianceScore}%, Trades: ${cell.tradeCount}`
                  : cell.date
              }
            >
              <span className={`text-sm md:text-base font-bold font-mono ${isSelected ? 'text-indigo-600 dark:text-white font-black' : ''}`}>
                {cell.dayNumber}
              </span>

              {isTodayCell && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-[#818cf8] absolute bottom-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ProgressCalendarCard;
