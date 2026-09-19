import React, { useEffect } from 'react';
import {
  X,
  FolderOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
  ShieldAlert,
  BarChart2,
  Calendar,
  Layers,
  ArrowRight
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
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#0e1017] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-red-500/10 via-purple-500/5 to-transparent border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Folder Icon badge matching Forex Factory */}
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-sm shadow-red-500/20">
                <FolderOpen className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{currencyMeta.flag}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/10">
                    {event.country}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    High Impact Event
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1.5 tracking-tight">
                  {event.title}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Date & Time ribbon */}
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-300 font-mono">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{event.time}</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Numbers: Actual vs Forecast vs Previous */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
            {/* Actual */}
            <div className="text-center p-3 rounded-lg bg-black/30 border border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Actual
              </div>
              <div
                className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                  event.outcome === 'beat'
                    ? 'text-emerald-400'
                    : event.outcome === 'miss'
                    ? 'text-rose-400'
                    : event.actual
                    ? 'text-white'
                    : 'text-slate-500'
                }`}
              >
                {event.actual || 'Pending'}
              </div>
              {event.outcome && event.outcome !== 'pending' && (
                <div
                  className={`text-[10px] font-bold uppercase mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                    event.outcome === 'beat'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : event.outcome === 'miss'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-500/20 text-slate-300'
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
            <div className="text-center p-3 rounded-lg bg-black/30 border border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Forecast
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-200 mt-1">
                {event.forecast || '-'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Consensus</div>
            </div>

            {/* Previous */}
            <div className="text-center p-3 rounded-lg bg-black/30 border border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Previous
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-300 mt-1">
                {event.previous || '-'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Prior Period</div>
            </div>
          </div>

          {/* Section: What's Going to Happen & Expected Volatility */}
          <div className="p-4 rounded-xl bg-red-500/[0.05] border border-red-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>What's Going to Happen & Market Volatility</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              {event.specs.whatHappens}
            </p>
          </div>

          {/* Section: Why Traders Care */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" />
              <span>Why Traders Care (Institutional Significance)</span>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {event.specs.whyTradersCare}
            </div>
          </div>

          {/* Section: Event Specifications (Exact Forex Factory Specs) */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Specifications & Release Mechanics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Source Agency</span>
                <p className="text-slate-200 font-medium">{event.specs.source}</p>
              </div>

              <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Frequency</span>
                <p className="text-slate-200 font-medium">{event.specs.frequency}</p>
              </div>

              <div className="sm:col-span-2 p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Measures</span>
                <p className="text-slate-200 font-medium">{event.specs.measures}</p>
              </div>

              <div className="sm:col-span-2 p-3 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/20 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-400">Usual Market Effect</span>
                <p className="text-slate-200 font-medium">{event.specs.usualEffect}</p>
              </div>
            </div>
          </div>

          {/* Affected Assets / Traded Symbols */}
          {event.specs.affectedSymbols && event.specs.affectedSymbols.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Key Affected Trading Instruments
              </div>
              <div className="flex flex-wrap gap-2">
                {event.specs.affectedSymbols.map(sym => (
                  <span
                    key={sym}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/5 text-white border border-white/10 hover:border-primary/50 transition-colors"
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-black/40 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-red-400" />
            <span>Forex Factory Macro Intelligence Protocol</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
