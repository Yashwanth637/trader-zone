import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Scissors,
  Calendar
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
  const [dateInput, setDateInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const speedOptions = [0.5, 1, 2, 5, 10];

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) return;
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      onJumpToDate(d);
      setShowDatePicker(false);
    }
  };

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
          title="Jump to Specific Historic Date (e.g. 1 year ago)"
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-elevated border border-border/40 dark:border-white/[0.08] transition-colors"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Theme-Adaptive Calendar Popover (Item 6) */}
        {showDatePicker && (
          <div className="absolute right-0 bottom-full mb-2 p-3 bg-surface border border-border/60 dark:border-white/[0.12] rounded-xl shadow-2xl z-50 min-w-[240px]">
            <form onSubmit={handleDateSubmit} className="space-y-2.5">
              <label className="block text-[11px] font-semibold text-foreground">
                Jump to Historical Date
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-card border border-border/60 dark:border-white/[0.1] text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
                style={{ fontFamily: 'Arial, sans-serif' }}
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="px-2.5 py-1 text-xs text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg"
                >
                  Jump
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
