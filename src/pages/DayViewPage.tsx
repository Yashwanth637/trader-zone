import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/calculations';
import { EmotionalState } from '../types/trade';
import {
  Calendar,
  Save,
  ArrowLeft,
  Smile,
  Shield,
  CheckCircle,
  FileText,
  TrendingUp,
  Plus
} from 'lucide-react';

export const DayViewPage: React.FC<{ onOpenAddTrade: () => void }> = ({ onOpenAddTrade }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accountTrades, rules, getJournalEntryForDate, saveJournalEntry, activeAccountId } = useTrading();

  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const dayTrades = accountTrades.filter(t => {
    const d = (t.closeTime || t.openTime).split('T')[0];
    return d === dateParam;
  });

  const dayPnl = dayTrades.reduce((sum, t) => sum + t.netPnl, 0);
  const winCount = dayTrades.filter(t => t.netPnl > 0).length;
  const dayWinRate = dayTrades.length > 0 ? Math.round((winCount / dayTrades.length) * 100) : 0;

  // Existing journal entry state
  const existingEntry = getJournalEntryForDate(dateParam);

  const [notes, setNotes] = useState(existingEntry?.reflectionNotes || '');
  const [preMarketPlan, setPreMarketPlan] = useState(existingEntry?.preMarketPlan || '');
  const [mood, setMood] = useState<EmotionalState>(existingEntry?.mood || 'Disciplined');
  const [rating, setRating] = useState<number>(existingEntry?.rating || 4);
  const [rulesChecked, setRulesChecked] = useState<Record<string, boolean>>(
    existingEntry?.rulesFollowed || {}
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const entry = getJournalEntryForDate(dateParam);
    if (entry) {
      setNotes(entry.reflectionNotes);
      setPreMarketPlan(entry.preMarketPlan || '');
      setMood(entry.mood);
      setRating(entry.rating);
      setRulesChecked(entry.rulesFollowed || {});
    } else {
      setNotes('');
      setPreMarketPlan('');
      setMood('Disciplined');
      setRating(4);
      setRulesChecked({});
    }
  }, [dateParam]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveJournalEntry({
      date: dateParam,
      accountId: activeAccountId === 'all' ? 'acc-1' : activeAccountId,
      reflectionNotes: notes,
      preMarketPlan,
      mood,
      rating,
      rulesFollowed: rulesChecked
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const toggleRuleCheck = (ruleId: string) => {
    setRulesChecked(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  const formattedDate = new Date(dateParam + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/journal')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Calendar</span>
        </button>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateParam}
            onChange={e => navigate(`/day-view?date=${e.target.value}`)}
            className="px-3 py-1.5 rounded-xl bg-surface-card border border-border text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Day Overview Banner */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        dayPnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
      }`}>
        <div>
          <span className="text-xs uppercase font-bold text-slate-400">Day View Review</span>
          <h1 className="text-2xl font-black text-white mt-0.5">{formattedDate}</h1>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
            <span>Trades Executed: <strong className="text-white">{dayTrades.length}</strong></span>
            <span>Win Rate: <strong className="text-white">{dayWinRate}%</strong></span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 font-bold uppercase">Net Day P&L</div>
          <div className={`text-3xl font-black font-mono ${dayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(dayPnl)}
          </div>
        </div>
      </div>

      {/* Main Journal Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Notes & Reflections */}
        <div className="md:col-span-2 space-y-5">
          <div className="premium-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <FileText className="w-4 h-4 text-primary-light" />
              <span>Pre-Market Game Plan</span>
            </div>
            <textarea
              rows={3}
              value={preMarketPlan}
              onChange={e => setPreMarketPlan(e.target.value)}
              placeholder="What high impact news is scheduled today? What key levels or session liquidity will you monitor?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-card border border-border text-white text-xs focus:border-primary focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="premium-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <FileText className="w-4 h-4 text-primary-light" />
              <span>Post-Market Review & Lessons</span>
            </div>
            <textarea
              rows={5}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How well did you execute your setups? Did you follow your stops? What emotions did you experience? What will you improve tomorrow?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-card border border-border text-white text-xs focus:border-primary focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Journal entry saved!
              </span>
            ) : <div />}
            <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
              Save Day Reflections
            </Button>
          </div>
        </div>

        {/* Right Col: Psychology & Rule Checklist */}
        <div className="space-y-5">
          {/* Psychology & Mood */}
          <div className="premium-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Smile className="w-4 h-4 text-amber-400" />
              <span>Psychological Check-In</span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Primary Mindset / Emotion</label>
              <select
                value={mood}
                onChange={e => setMood(e.target.value as EmotionalState)}
                className="w-full px-3 py-2 rounded-xl bg-surface-card border border-border text-xs text-white focus:border-primary focus:outline-none"
              >
                <option value="Disciplined">Disciplined</option>
                <option value="Calm">Calm & Patient</option>
                <option value="Confident">Confident</option>
                <option value="FOMO">FOMO (Chasing)</option>
                <option value="Revenge">Revenge Mindset</option>
                <option value="Fearful">Fearful / Hesitant</option>
                <option value="Impatient">Impatient</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Execution Discipline Rating (1-5)</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      rating >= star
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'bg-surface-card text-slate-500 border-border'
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Rules Checklist */}
          <div className="premium-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Rule Compliance Checklist</span>
            </div>

            {rules.map(rule => {
              const checked = !!rulesChecked[rule.id];
              return (
                <div
                  key={rule.id}
                  onClick={() => toggleRuleCheck(rule.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    checked
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-surface-card/60 border-border text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="text-xs font-medium pr-2">{rule.name}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    className="rounded text-primary focus:ring-0"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </form>

      {/* Trades Closed On This Day */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Trades Executed on this Day ({dayTrades.length})</h3>
          <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onOpenAddTrade}>
            Add Trade to Day
          </Button>
        </div>

        {dayTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-border rounded-xl">
            No trades recorded on {formattedDate}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-slate-400 uppercase font-semibold">
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Lots</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">Exit</th>
                  <th className="pb-2">Pips</th>
                  <th className="pb-2">Net P&L</th>
                  <th className="pb-2">Strategy</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {dayTrades.map(t => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                    <td className="py-2.5">
                      <Badge variant={t.direction === 'BUY' ? 'buy' : 'sell'} size="sm">
                        {t.direction}
                      </Badge>
                    </td>
                    <td className="py-2.5 font-mono">{t.lotSize}</td>
                    <td className="py-2.5 font-mono text-slate-300">{t.entryPrice}</td>
                    <td className="py-2.5 font-mono text-slate-300">{t.exitPrice || '-'}</td>
                    <td className="py-2.5 font-mono text-slate-300">{t.pips}</td>
                    <td className={`py-2.5 font-mono font-bold ${t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(t.netPnl)}
                    </td>
                    <td className="py-2.5 text-slate-400">{t.strategyName || 'Discretionary'}</td>
                    <td className="py-2.5 text-right">
                      <Link to={`/trades/${t.id}`} className="text-primary-light hover:underline font-semibold">
                        Review Trade →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
