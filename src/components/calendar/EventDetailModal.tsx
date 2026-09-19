import React, { useEffect } from 'react';
import {
  X,
  FolderOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  BarChart2,
  Calendar,
  Layers
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
  // ESC key listener to close modal
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

  // Format date display
  const dateObj = new Date(event.date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card with full Light & Dark theme support */}
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-red-500/10 via-purple-500/5 to-transparent border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Folder Icon badge matching Forex Factory */}
              <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-sm shadow-red-500/20">
                <FolderOpen className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{currencyMeta.flag}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-foreground border border-border">
                    {event.country}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    High Impact Event
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
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Date & Time ribbon (Displaying IST UTC +5:30) */}
          <div className="flex items-center gap-4 mt-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-muted">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              <span className="text-foreground font-medium">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{event.time} IST (UTC +5:30)</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Numbers: Actual vs Forecast vs Previous */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-card border border-border">
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

          {/* Section: What's Going to Happen & Expected Volatility */}
          <div className="p-4 rounded-xl bg-red-500/[0.07] border border-red-500/25">
            <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>What's Going to Happen & Market Volatility</span>
            </div>
            <p className="text-xs sm:text-sm text-foreground mt-2 leading-relaxed font-medium">
              {event.specs.whatHappens}
            </p>
          </div>

          {/* Section: Why Traders Care */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" />
              <span>Why Traders Care (Institutional Significance)</span>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-border text-xs sm:text-sm text-foreground leading-relaxed font-medium">
              {event.specs.whyTradersCare}
            </div>
          </div>

          {/* Section: Event Specifications (Exact Forex Factory Specs) */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Specifications & Release Mechanics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-card border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Source Agency</span>
                <p className="text-foreground font-semibold">{event.specs.source}</p>
              </div>

              <div className="p-3 rounded-lg bg-surface-card border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Frequency</span>
                <p className="text-foreground font-semibold">{event.specs.frequency}</p>
              </div>

              <div className="sm:col-span-2 p-3 rounded-lg bg-surface-card border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Measures</span>
                <p className="text-foreground font-semibold">{event.specs.measures}</p>
              </div>

              <div className="sm:col-span-2 p-3 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/25 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Usual Market Effect</span>
                <p className="text-foreground font-semibold">{event.specs.usualEffect}</p>
              </div>
            </div>
          </div>

          {/* Affected Assets / Traded Symbols */}
          {event.specs.affectedSymbols && event.specs.affectedSymbols.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Key Affected Trading Instruments
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
            <FolderOpen className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
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
