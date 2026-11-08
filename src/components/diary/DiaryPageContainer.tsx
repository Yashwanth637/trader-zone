import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { DailyDiarySection } from './DailyDiarySection';
import { SundayReviewSection } from './SundayReviewSection';
import { MonthlyFocusStickyCard } from './MonthlyFocusStickyCard';
import {
  BookOpen,
  CalendarCheck,
  Pin,
  Sparkles,
  Calendar as CalendarIcon
} from 'lucide-react';

interface DiaryPageContainerProps {
  currentDate: Date;
  onSwitchToCalendar: () => void;
}

export const DiaryPageContainer: React.FC<DiaryPageContainerProps> = ({
  currentDate,
  onSwitchToCalendar
}) => {
  const { accountTrades, journalEntries, saveJournalEntry, activeAccountId } = useTrading();

  // Sub-tabs within Dairy
  const [diaryTab, setDiaryTab] = useState<'daily' | 'sunday' | 'monthly'>('daily');

  // Currently selected date for Daily Diary (defaults to today in YYYY-MM-DD format)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const handleOpenDayDiary = (dateStr: string) => {
    setSelectedDate(dateStr);
    setDiaryTab('daily');
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  return (
    <div className="space-y-6">
      {/* Dairy Sub-Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07] shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            onClick={() => setDiaryTab('daily')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              diaryTab === 'daily'
                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Daily Dairy (Do's & Don'ts)</span>
          </button>

          <button
            onClick={() => setDiaryTab('sunday')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              diaryTab === 'sunday'
                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Sunday Review (Leak Matrix)</span>
          </button>

          <button
            onClick={() => setDiaryTab('monthly')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              diaryTab === 'monthly'
                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Monthly 4 Rules (Sticky Note)</span>
          </button>
        </div>

        <button
          onClick={onSwitchToCalendar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border/40 hover:border-primary/50 text-xs font-semibold text-muted hover:text-foreground transition-all self-end sm:self-auto mr-1"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>View Monthly Calendar</span>
        </button>
      </div>

      {/* Tab Panels */}
      {diaryTab === 'daily' && (
        <DailyDiarySection
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          trades={accountTrades}
          journalEntries={journalEntries}
          onSaveEntry={saveJournalEntry}
          activeAccountId={activeAccountId}
        />
      )}

      {diaryTab === 'sunday' && (
        <SundayReviewSection
          trades={accountTrades}
          journalEntries={journalEntries}
          activeAccountId={activeAccountId}
          onOpenDayDiary={handleOpenDayDiary}
        />
      )}

      {diaryTab === 'monthly' && (
        <MonthlyFocusStickyCard
          year={year}
          month={month}
          journalEntries={journalEntries}
          activeAccountId={activeAccountId}
        />
      )}
    </div>
  );
};
