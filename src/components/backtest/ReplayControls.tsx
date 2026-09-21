import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Scissors,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface ReplayControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  currentIndex: number;
  totalCandles: number;
  onSeek: (index: number) => void;
  isCutMode: boolean;
  onToggleCutMode: () => void;
  currentBarTimeFormatted?: string;
  onJumpToDate: (date: Date) => void;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBack,
  onReset,
  speed,
  onChangeSpeed,
  currentIndex,
  totalCandles,
  onSeek,
  isCutMode,
  onToggleCutMode,
  currentBarTimeFormatted,
  onJumpToDate
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calendar State
  const [viewDate, setViewDate] = useState(() => new Date());

  const speedOptions = [0.5, 1, 2, 5, 10];

  // Month navigation
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, 12, 0, 0);
    onJumpToDate(selected);
    setShowDatePicker(false);
  };

  const handleQuickPreset = (monthsAgo: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    onJumpToDate(d);
    setShowDatePicker(false);
  };

  // Calendar Grid Calculation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 bg-surface-card/90 backdrop-blur-md border border-border/40 dark:border-white/[0.08] rounded-2xl shadow-xl">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
        {/* Reset */}
        <button
          type="button"
          onClick={onReset}
          title="Reset to Start"
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Step Back */}
        <button
          type="button"
          disabled={currentIndex <= 0}
          onClick={onStepBack}
          title="Previous Bar (Left Arrow)"
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-elevated disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs shadow-md transition-all font-sans ${
            isPlaying
              ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
              : 'bg-primary text-white shadow-primary/25 hover:bg-primary-hover'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        {/* Step Forward */}
        <button
          type="button"
          disabled={currentIndex >= totalCandles - 1}
          onClick={onStepForward}
          title="Next Bar (Right Arrow)"
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-elevated disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border/40 dark:border-white/[0.08] ml-1">
          {speedOptions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeSpeed(s)}
              className={`px-1.5 py-1 text-[10px] font-bold rounded ${
                speed === s ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
              }`}
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Cut Bar Mode */}
        <button
          type="button"
          onClick={onToggleCutMode}
          title="Cut Bar: Click anywhere on chart to replay from that bar"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            isCutMode
              ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
              : 'border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isCutMode ? 'Click Chart Bar' : 'Cut Bar'}</span>
        </button>
      </div>

      {/* Middle: Progress Scrubber Slider */}
      <div className="flex-1 flex items-center gap-3 w-full max-w-md mx-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalCandles - 1)}
          value={currentIndex}
          onChange={e => onSeek(parseInt(e.target.value, 10))}
          className="w-full accent-primary h-1.5 bg-slate-700/40 rounded-lg cursor-pointer"
        />
        <span
          className="text-[11px] text-muted whitespace-nowrap"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {currentIndex + 1} / {totalCandles}
        </span>
      </div>

      {/* Right: Date Info & Jump to Date (Calendar) */}
      <div className="flex items-center gap-2 relative">
        {currentBarTimeFormatted && (
          <div
            className="text-[11px] font-medium text-foreground bg-surface-elevated px-2.5 py-1 rounded-lg border border-border/40 dark:border-white/[0.08]"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {currentBarTimeFormatted}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowDatePicker(!showDatePicker)}
          title="Jump to Specific Historic Date (Open Calendar)"
          className={`p-2 rounded-xl border transition-colors ${
            showDatePicker
              ? 'bg-primary text-white border-primary'
              : 'text-muted hover:text-foreground hover:bg-surface-elevated border-border/40 dark:border-white/[0.08]'
          }`}
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Rich Interactive Visual Calendar Modal (Item 5) */}
        {showDatePicker && (
          <div className="absolute right-0 bottom-full mb-3 p-4 bg-surface border border-border/60 dark:border-white/[0.12] rounded-2xl shadow-2xl z-50 w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-150 select-none">
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40 dark:border-white/[0.06] mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground">
                  {monthNames[month]} {year}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-elevated"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-elevated"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="p-1 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 ml-1"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[
                { label: '1M Ago', months: 1 },
                { label: '3M Ago', months: 3 },
                { label: '6M Ago', months: 6 },
                { label: '1Y Ago', months: 12 }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleQuickPreset(preset.months)}
                  className="py-1 px-1.5 rounded-lg text-[10px] font-bold bg-surface-elevated hover:bg-primary/20 text-muted hover:text-primary border border-border/40 dark:border-white/[0.06] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted mb-1.5">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="py-0.5">{d}</div>
              ))}
            </div>

            {/* Interactive Day Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {/* Blank cells for offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="p-1.5 text-transparent">0</div>
              ))}

              {/* Days of current month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className="p-1.5 rounded-lg font-medium text-foreground hover:bg-primary hover:text-white transition-all text-center"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
