import React, { useEffect } from 'react';
import {
  X,
  FolderOpen,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  ExternalLink
} from 'lucide-react';
import { EconomicEvent, CURRENCY_METADATA } from '../../lib/eventCalendarService';

interface EventDetailModalProps {
  isOpen: boolean;
  event: EconomicEvent | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  onClose
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const currencyMeta = CURRENCY_METADATA[event.country] || {
    flag: '🌐',
    countryName: event.country,
    name: event.country
  };

  const dateObj = new Date(event.date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const impactColorMap = {
    High: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    Medium: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    Low: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    Holiday: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Top Ribbon */}
        <div className="p-5 sm:p-6 border-b border-border bg-surface-card/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Folder Icon badge */}
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                <FolderOpen className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{currencyMeta.flag}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-foreground border border-border">
                    {event.country}
                  </span>
                  <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${impactColorMap[event.impact]}`}>
                    {event.impact === 'Holiday' ? 'Bank Holiday / Non-Economic' : `${event.impact} Impact`}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-foreground mt-1.5 tracking-tight">
                  {event.title}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Date & Time (IST UTC +5:30) */}
          <div className="flex items-center gap-4 mt-4 text-xs font-mono flex-wrap">
            <div className="flex items-center gap-1.5 text-muted">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              <span className="text-foreground font-medium">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{event.time} IST (UTC +5:30)</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Metrics Trio: Actual vs Forecast vs Previous */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-card border border-border shadow-xs">
            {/* Actual */}
            <div className="text-center p-3 rounded-lg bg-black/[0.02] dark:bg-black/30 border border-border">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Actual
              </div>
              <div
                className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                  event.outcome === 'beat'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : event.outcome === 'miss'
                    ? 'text-rose-600 dark:text-rose-400'
                    : event.actual
                    ? 'text-foreground'
                    : 'text-muted'
                }`}
              >
                {event.actual || 'Pending'}
              </div>
              {event.outcome && event.outcome !== 'pending' && (
                <div
                  className={`text-[10px] font-bold uppercase mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                    event.outcome === 'beat'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                      : event.outcome === 'miss'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                      : 'bg-black/5 dark:bg-white/10 text-muted'
                  }`}
                >
                  {event.outcome === 'beat' ? (
                    <>
                      <TrendingUp className="w-3 h-3" /> Beat
                    </>
                  ) : event.outcome === 'miss' ? (
                    <>
                      <TrendingDown className="w-3 h-3" /> Miss
                    </>
                  ) : (
                    'In-Line'
                  )}
                </div>
              )}
            </div>

            {/* Forecast */}
            <div className="text-center p-3 rounded-lg bg-black/[0.02] dark:bg-black/30 border border-border">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Forecast
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground mt-1">
                {event.forecast || '-'}
              </div>
              <div className="text-[10px] text-muted mt-1">Consensus</div>
            </div>

            {/* Previous */}
            <div className="text-center p-3 rounded-lg bg-black/[0.02] dark:bg-black/30 border border-border">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Previous
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground mt-1">
                {event.previous || '-'}
              </div>
              <div className="text-[10px] text-muted mt-1">Prior Period</div>
            </div>
          </div>

          {/* Authentic Forex Factory Specs Table (Exact layout from Image 4) */}
          <div className="rounded-xl border border-border overflow-hidden shadow-xs">
            {/* Table Header Bar */}
            <div className="px-4 py-2.5 bg-[#5b6e8a] dark:bg-[#253246] text-white flex items-center justify-between font-sans">
              <span className="text-sm font-bold tracking-tight">Specs</span>
              <span className="text-[11px] opacity-80 font-medium">© Fair Economy</span>
            </div>

            {/* 2-Column Key-Value Grid */}
            <div className="divide-y divide-border text-xs">
              {/* 1. Source */}
              <div className="grid grid-cols-1 sm:grid-cols-4">
                <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                  Source
                </div>
                <div className="p-3 sm:col-span-3 text-foreground bg-surface leading-relaxed">
                  <span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium">
                    {event.specs.source}
                  </span>
                </div>
              </div>

              {/* 2. Measures */}
              <div className="grid grid-cols-1 sm:grid-cols-4">
                <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                  Measures
                </div>
                <div className="p-3 sm:col-span-3 text-foreground bg-surface leading-relaxed">
                  {event.specs.measures}
                </div>
              </div>

              {/* 3. Usual Effect */}
              <div className="grid grid-cols-1 sm:grid-cols-4">
                <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                  Usual Effect
                </div>
                <div className="p-3 sm:col-span-3 text-foreground bg-surface leading-relaxed font-medium">
                  {event.specs.usualEffect}
                </div>
              </div>

              {/* 4. Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-4">
                <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                  Frequency
                </div>
                <div className="p-3 sm:col-span-3 text-foreground bg-surface leading-relaxed">
                  {event.specs.frequency}
                </div>
              </div>

              {/* 5. Next Release */}
              {event.specs.nextRelease && (
                <div className="grid grid-cols-1 sm:grid-cols-4">
                  <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                    Next Release
                  </div>
                  <div className="p-3 sm:col-span-3 text-primary hover:underline cursor-pointer font-semibold bg-surface">
                    {event.specs.nextRelease}
                  </div>
                </div>
              )}

              {/* 6. FF Notes */}
              {event.specs.ffNotes && (
                <div className="grid grid-cols-1 sm:grid-cols-4">
                  <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                    FF Notes
                  </div>
                  <div className="p-3 sm:col-span-3 text-foreground bg-surface leading-relaxed">
                    {event.specs.ffNotes}
                  </div>
                </div>
              )}

              {/* 7. Why Traders Care */}
              <div className="grid grid-cols-1 sm:grid-cols-4">
                <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                  Why Traders Care
                </div>
                <div className="p-3 sm:col-span-3 text-foreground bg-surface leading-relaxed">
                  {event.specs.whyTradersCare}
                </div>
              </div>

              {/* 8. Derived Via */}
              {event.specs.derivedVia && (
                <div className="grid grid-cols-1 sm:grid-cols-4">
                  <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                    Derived Via
                  </div>
                  <div className="p-3 sm:col-span-3 text-foreground bg-surface leading-relaxed">
                    {event.specs.derivedVia}
                  </div>
                </div>
              )}

              {/* 9. Acro Expand */}
              {event.specs.acroExpand && (
                <div className="grid grid-cols-1 sm:grid-cols-4">
                  <div className="p-3 font-bold text-foreground bg-black/[0.03] dark:bg-white/[0.03] sm:border-r border-border">
                    Acro Expand
                  </div>
                  <div className="p-3 sm:col-span-3 font-semibold text-foreground bg-surface">
                    {event.specs.acroExpand}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Traded Pairs Affected */}
          {event.specs.affectedSymbols && event.specs.affectedSymbols.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Key Correlated Trading Instruments
              </div>
              <div className="flex flex-wrap gap-2">
                {event.specs.affectedSymbols.map(sym => (
                  <span
                    key={sym}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-black/5 dark:bg-white/5 text-foreground border border-border hover:border-primary/50 transition-colors"
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-surface-card border-t border-border flex items-center justify-between">
          <div className="text-[11px] text-muted flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-primary" />
            <span>Forex Factory Macro Intelligence Protocol</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-foreground transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
