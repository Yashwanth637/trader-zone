import React, { useState, useEffect } from 'react';
import { Trade } from '../../types/trade';
import { DailyJournalEntry } from '../../types/journal';
import { AssetLogo, formatSymbolDisplay } from '../common/AssetLogo';
import { formatCurrency, formatSignedPnl } from '../../lib/calculations';
import { DEFAULT_PRESET_DOS, DEFAULT_PRESET_DONTS } from '../../lib/diaryAnalytics';
import {
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Save,
  Check,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DailyDiarySectionProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  trades: Trade[];
  journalEntries: DailyJournalEntry[];
  onSaveEntry: (entry: Omit<DailyJournalEntry, 'id' | 'updatedAt'>) => void;
  activeAccountId: string;
}

export const DailyDiarySection: React.FC<DailyDiarySectionProps> = ({
  selectedDate,
  onSelectDate,
  trades,
  journalEntries,
  onSaveEntry,
  activeAccountId
}) => {
  const [currentEntry, setCurrentEntry] = useState<DailyJournalEntry | undefined>(undefined);
  const [dos, setDos] = useState<string[]>([]);
  const [donts, setDonts] = useState<string[]>([]);
  const [reflection, setReflection] = useState<string>('');
  const [customDo, setCustomDo] = useState('');
  const [customDont, setCustomDont] = useState('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Sync state when selectedDate or journalEntries changes
  useEffect(() => {
    const entry = journalEntries.find(
      j => j.date === selectedDate && (activeAccountId === 'all' || j.accountId === activeAccountId)
    );
    setCurrentEntry(entry);
    setDos(entry?.dos ? [...entry.dos] : []);
    setDonts(entry?.donts ? [...entry.donts] : []);
    setReflection(entry?.reflectionNotes || '');
    setIsSavedRecently(false);
  }, [selectedDate, journalEntries, activeAccountId]);

  // Trades on selected date
  const dayTrades = trades.filter(t => {
    const tradeDate = (t.closeTime || t.openTime).split('T')[0];
    return tradeDate === selectedDate && (activeAccountId === 'all' || t.accountId === activeAccountId);
  });

  const dayPnl = dayTrades.reduce((sum, t) => sum + (Number(t.netPnl) || 0), 0);
  const wins = dayTrades.filter(t => (Number(t.netPnl) || 0) > 0.01).length;
  const losses = dayTrades.filter(t => (Number(t.netPnl) || 0) < -0.01).length;

  // Auto-detected mistakes from trade logs
  const detectedTradeMistakes = Array.from(
    new Set(
      dayTrades.flatMap(t => t.mistakeTags || []).filter(Boolean)
    )
  );

  const handleAddDo = (item: string) => {
    const clean = item.trim();
    if (!clean || dos.includes(clean)) return;
    setDos(prev => [...prev, clean]);
    setCustomDo('');
  };

  const handleRemoveDo = (item: string) => {
    setDos(prev => prev.filter(d => d !== item));
  };

  const handleAddDont = (item: string) => {
    const clean = item.trim();
    if (!clean || donts.includes(clean)) return;
    setDonts(prev => [...prev, clean]);
    setCustomDont('');
  };

  const handleRemoveDont = (item: string) => {
    setDonts(prev => prev.filter(d => d !== item));
  };

  const handleSave = () => {
    const accountIdToUse = activeAccountId === 'all' ? (dayTrades[0]?.accountId || 'acc-1') : activeAccountId;

    onSaveEntry({
      date: selectedDate,
      accountId: accountIdToUse,
      reflectionNotes: reflection,
      preMarketPlan: currentEntry?.preMarketPlan || '',
      mood: currentEntry?.mood || 'Disciplined',
      rating: currentEntry?.rating || (dayPnl >= 0 ? 4 : 3),
      rulesFollowed: currentEntry?.rulesFollowed || {},
      marketConditions: currentEntry?.marketConditions || 'Trending',
      dos,
      donts
    });

    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 3000);
  };

  // Format date display
  const dateObj = new Date(selectedDate + 'T00:00:00');
  const formattedDayStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Top Date Bar & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-foreground font-mono">
                {formattedDayStr}
              </h2>
              {dayTrades.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                  dayPnl >= 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  {formatSignedPnl(dayPnl)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              {dayTrades.length} trade{dayTrades.length === 1 ? '' : 's'} recorded ({wins}W / {losses}L) • Log your daily execution rules and habits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Date Picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={e => e.target.value && onSelectDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface border border-slate-200/80 dark:border-white/[0.08] text-xs font-mono text-foreground focus:outline-none focus:border-primary"
          />

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isSavedRecently
                ? 'bg-emerald-500 text-white'
                : 'bg-primary text-white hover:bg-primary-hover shadow-primary/25'
            }`}
          >
            {isSavedRecently ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Dairy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trade History Section (Requirement 2 & Image 4 softened borders) */}
      <div className="p-4 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Trades Taken on This Date
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border/40 text-foreground font-mono font-bold">
              {dayTrades.length}
            </span>
          </div>

          {detectedTradeMistakes.length > 0 && (
            <button
              onClick={() => {
                detectedTradeMistakes.forEach(m => handleAddDont(m));
              }}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Import {detectedTradeMistakes.length} mistakes into Don'ts</span>
            </button>
          )}
        </div>

        {dayTrades.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border/30 dark:border-white/[0.06] text-center text-xs text-muted">
            No trade executions logged on this date. You can still write your daily Do's & Don'ts or psychological reflections.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {dayTrades.map(t => {
              const pnlVal = Number(t.netPnl) || 0;
              const isProfit = pnlVal > 0.01;
              const isLoss = pnlVal < -0.01;
              const openTime = t.openTime ? new Date(t.openTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';

              return (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-surface border border-border/30 dark:border-white/[0.07] flex items-center justify-between gap-3 hover:border-primary/40 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AssetLogo symbol={t.symbol} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-foreground truncate">
                          {formatSymbolDisplay(t.symbol)}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          t.direction === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                        }`}>
                          {t.direction}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted font-mono">
                        {openTime} • {t.lotSize} lots
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-black font-mono flex items-center justify-end gap-0.5 ${
                      isProfit ? 'text-emerald-600 dark:text-emerald-400' : isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                    }`}>
                      {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : isLoss ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                      <span>{formatCurrency(pnlVal)}</span>
                    </div>
                    {t.mistakeTags && t.mistakeTags.length > 0 && (
                      <div className="text-[9px] text-rose-600 dark:text-rose-400 font-medium truncate max-w-[100px]">
                        {t.mistakeTags.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Main Columns: Do's (Green) and Don'ts (Red) as in video */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Do's (What Went Right) */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-foreground">
                Do's <span className="text-xs font-normal text-muted">(What went right today)</span>
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20">
              {dos.length} logged
            </span>
          </div>

          {/* List of active Do's */}
          <div className="space-y-2 min-h-[90px]">
            {dos.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-border/30 dark:border-white/[0.06] text-center text-xs text-muted">
                No Do's logged yet. Pick from quick tags below or write what you did right.
              </div>
            ) : (
              dos.map(item => (
                <div
                  key={item}
                  className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 group hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveDo(item)}
                    className="p-1 rounded text-muted hover:text-rose-600 dark:hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick-add preset chips */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
              Quick Suggestions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_PRESET_DOS.map(preset => {
                const isSelected = dos.includes(preset);
                return (
                  <button
                    key={preset}
                    onClick={() => (isSelected ? handleRemoveDo(preset) : handleAddDo(preset))}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-white border-emerald-500 font-semibold'
                        : 'bg-surface border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-muted hover:text-foreground hover:border-emerald-500/40'
                    }`}
                  >
                    + {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom text input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleAddDo(customDo);
            }}
            className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]"
          >
            <input
              type="text"
              placeholder="Add your own custom Do..."
              value={customDo}
              onChange={e => setCustomDo(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-slate-200/80 dark:border-white/[0.08] text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!customDo.trim()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-40"
            >
              Add
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Don'ts (Mistakes Made) */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-foreground">
                Don'ts <span className="text-xs font-normal text-muted">(Mistakes made today)</span>
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 font-mono font-bold border border-rose-500/20">
              {donts.length} logged
            </span>
          </div>

          {/* List of active Don'ts */}
          <div className="space-y-2 min-h-[90px]">
            {donts.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-border/30 dark:border-white/[0.06] text-center text-xs text-muted">
                No Don'ts logged today! Keep execution clean, or record any slips below.
              </div>
            ) : (
              donts.map(item => (
                <div
                  key={item}
                  className="p-2.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2 group hover:border-rose-500/40 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveDont(item)}
                    className="p-1 rounded text-muted hover:text-rose-600 dark:hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick-add preset mistake chips */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
              Common Mistakes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_PRESET_DONTS.map(preset => {
                const isSelected = donts.includes(preset);
                return (
                  <button
                    key={preset}
                    onClick={() => (isSelected ? handleRemoveDont(preset) : handleAddDont(preset))}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-rose-500 text-white border-rose-500 font-semibold'
                        : 'bg-surface border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-muted hover:text-foreground hover:border-rose-500/40'
                    }`}
                  >
                    ✕ {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom text input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleAddDont(customDont);
            }}
            className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]"
          >
            <input
              type="text"
              placeholder="Add your own custom Don't..."
              value={customDont}
              onChange={e => setCustomDont(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-slate-200/80 dark:border-white/[0.08] text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              disabled={!customDont.trim()}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500 hover:text-white transition-all disabled:opacity-40"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {/* Reflection & Mental Notes */}
      <div className="p-4 rounded-2xl bg-surface-card border border-border/30 dark:border-white/[0.07] space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted block">
          Daily Diary Reflections & Trade Psychology
        </label>
        <textarea
          rows={3}
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="What felt good? What caused emotional friction? Notes for tomorrow..."
          className="w-full p-3 rounded-xl bg-surface border border-slate-200/80 dark:border-white/[0.08] text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <div className="flex items-center justify-end">
          <button
            onClick={handleSave}
            className="text-xs font-bold text-primary hover:text-primary-light transition-colors flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save notes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
