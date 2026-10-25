import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Storage } from '../lib/storage';
import { HundredTradesChallenge, Trade } from '../types/trade';
import { formatCurrency } from '../lib/calculations';
import {
  export100TradesExcel,
  export100TradesPDF,
  inferClosedBy
} from '../lib/challengeExport';
import {
  Target,
  Trophy,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  Check,
  ChevronDown,
  Flame,
  Brain
} from 'lucide-react';
import { AssetLogo, formatSymbolDisplay } from '../components/common/AssetLogo';

export const ProgressTrackerPage: React.FC = () => {
  const { trades, accounts, activeAccountId, updateTrade } = useTrading();

  // Load challenge from storage
  const [challenge, setChallenge] = useState<HundredTradesChallenge | null>(() => {
    return Storage.getHundredTradesChallenge();
  });

  // Modal for creating / restarting challenge
  const [modalOpen, setModalOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  const [formName, setFormName] = useState('100 Trades Discipline Challenge');
  const [formStartDate, setFormStartDate] = useState(todayStr);
  const [formAccountId, setFormAccountId] = useState('all');
  const [formNotes, setFormNotes] = useState('');

  // Table filter states
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [closedByFilter, setClosedByFilter] = useState<'ALL' | 'TP' | 'SL' | 'User'>('ALL');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC'); // ASC: #1 -> #100, DESC: #100 -> #1

  // Save new or reset challenge
  const handleSaveChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    const newChallenge: HundredTradesChallenge = {
      id: `challenge-${Date.now()}`,
      name: formName.trim() || '100 Trades Discipline Challenge',
      startDate: formStartDate || todayStr,
      targetTrades: 100,
      targetDays: 100,
      accountId: formAccountId,
      notes: formNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    setChallenge(newChallenge);
    Storage.saveHundredTradesChallenge(newChallenge);
    setModalOpen(false);
  };

  const handleResetChallengeClick = () => {
    if (confirm('Start a new 100 Trades Challenge? Your previous trades will remain in history, but tracking will reset to your new start date.')) {
      setFormName('100 Trades Discipline Challenge');
      setFormStartDate(todayStr);
      setFormAccountId(activeAccountId || 'all');
      setFormNotes('');
      setModalOpen(true);
    }
  };

  // Find target trades for the challenge
  const challengeTrades: Trade[] = useMemo(() => {
    if (!challenge) return [];

    const startTimestamp = new Date(`${challenge.startDate}T00:00:00`).getTime();

    // Filter by account and start date
    const relevant = trades.filter(t => {
      if (challenge.accountId !== 'all' && t.accountId !== challenge.accountId) {
        return false;
      }
      const tradeTime = new Date(t.openTime).getTime();
      return tradeTime >= startTimestamp;
    });

    // Sort chronologically (oldest first: #1 to #100)
    const sorted = [...relevant].sort(
      (a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
    );

    // Take max 100 trades
    return sorted.slice(0, challenge.targetTrades);
  }, [trades, challenge]);

  // Filtered view for the table
  const displayedTrades = useMemo(() => {
    let list = challengeTrades.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        const mSym = t.symbol.toLowerCase().includes(q);
        const mNotes = t.notes?.toLowerCase().includes(q);
        const mEmotion = t.emotionalState?.toLowerCase().includes(q);
        if (!mSym && !mNotes && !mEmotion) return false;
      }
      if (outcomeFilter === 'WIN' && t.netPnl <= 0.01) return false;
      if (outcomeFilter === 'LOSS' && t.netPnl >= -0.01) return false;

      const closedBy = inferClosedBy(t);
      if (closedByFilter !== 'ALL' && closedBy !== closedByFilter) return false;

      return true;
    });

    if (sortOrder === 'DESC') {
      return [...list].reverse();
    }
    return list;
  }, [challengeTrades, search, outcomeFilter, closedByFilter, sortOrder]);

  // Overall Challenge Statistics
  const stats = useMemo(() => {
    const total = challengeTrades.length;
    const wins = challengeTrades.filter(t => t.netPnl > 0.01).length;
    const losses = challengeTrades.filter(t => t.netPnl < -0.01).length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalPnl = challengeTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);

    const tpCount = challengeTrades.filter(t => inferClosedBy(t) === 'TP').length;
    const slCount = challengeTrades.filter(t => inferClosedBy(t) === 'SL').length;
    const userCount = challengeTrades.filter(t => inferClosedBy(t) === 'User').length;

    const avgStars = total > 0
      ? challengeTrades.reduce((sum, t) => sum + (t.executionRating ?? (t.netPnl >= 0 ? 5 : 3)), 0) / total
      : 0;

    // Days elapsed
    let daysElapsed = 1;
    if (challenge) {
      const diffMs = Date.now() - new Date(`${challenge.startDate}T00:00:00`).getTime();
      daysElapsed = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

    // Frequent mistakes
    const mistakeMap: Record<string, number> = {};
    challengeTrades.forEach(t => {
      (t.mistakeTags || []).forEach(m => {
        mistakeMap[m] = (mistakeMap[m] || 0) + 1;
      });
    });
    const topMistakes = Object.entries(mistakeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      total,
      wins,
      losses,
      winRate,
      totalPnl,
      tpCount,
      slCount,
      userCount,
      avgStars,
      daysElapsed,
      topMistakes
    };
  }, [challengeTrades, challenge]);

  const accountLabel = useMemo(() => {
    if (!challenge) return 'All Accounts';
    if (challenge.accountId === 'all') return 'All Accounts';
    const acc = accounts.find(a => a.id === challenge.accountId);
    return acc ? acc.name : 'Unknown Account';
  }, [challenge, accounts]);

  // Handle changing Closed By on the fly
  const handleUpdateClosedBy = (tradeId: string, val: 'TP' | 'SL' | 'User') => {
    updateTrade(tradeId, { closedBy: val });
  };

  // Handle changing Star Rating on the fly
  const handleUpdateRating = (tradeId: string, star: number) => {
    updateTrade(tradeId, { executionRating: star });
  };

  // IF NO ACTIVE CHALLENGE IS SET, SHOW ONBOARDING HERO CARD
  if (!challenge) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 text-white">
            <Target className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            100 Trades Challenge
          </h1>
          <p className="text-sm text-muted max-w-xl mx-auto">
            A trade-by-trade under-record to build your psychology, master discipline, and notice mistakes from one trade to the next across 100 consecutive trades.
          </p>
        </div>

        <div className="premium-card p-6 md:p-8 border border-border max-w-xl mx-auto shadow-xl">
          <form onSubmit={handleSaveChallenge} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Challenge Name
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. 100 Trades Discipline Challenge"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Challenge Start Date
                </label>
                <input
                  type="date"
                  required
                  value={formStartDate}
                  onChange={e => setFormStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  Trades from this date onward will be tracked.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Target Account
                </label>
                <select
                  value={formAccountId}
                  onChange={e => setFormAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Accounts (Consolidated)</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.broker})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-muted mt-1 block">
                  Choose which account to track.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Personal Rules & Goals (Optional)
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="e.g. Max 1-2 trades/day, wait for setup confirmation, no revenge trades."
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-cyan-500/25"
            >
              Launch 100 Trades Challenge →
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ACTIVE CHALLENGE VIEW
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Challenge Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  {challenge.name}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  DAY {stats.daysElapsed} OF 100
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                <span>Account: <strong className="text-foreground">{accountLabel}</strong></span>
                <span>•</span>
                <span>Started: <strong className="text-foreground">{new Date(challenge.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</strong></span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Export Excel, Export PDF, Reset */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs"
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            onClick={() => export100TradesExcel(challenge, challengeTrades, accountLabel)}
            title="Download column-wise Excel CSV format"
          >
            Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-primary/40 text-primary-light hover:bg-primary/10 font-bold text-xs"
            icon={<FileText className="w-3.5 h-3.5" />}
            onClick={() => export100TradesPDF(challenge, challengeTrades, accountLabel)}
            title="Download audited column-wise PDF"
          >
            Export PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs text-muted hover:text-foreground"
            icon={<RotateCcw className="w-3 h-3" />}
            onClick={handleResetChallengeClick}
          >
            Restart / Settings
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Progress Bar Card */}
        <div className="premium-card p-4 border border-cyan-500/30 bg-cyan-500/5 space-y-2">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <span>Challenge Progress</span>
            <Target className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {stats.total} <span className="text-sm font-normal text-muted">/ 100 Trades</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, stats.total))}%` }}
            />
          </div>
          <div className="text-[11px] text-muted flex items-center justify-between">
            <span>{100 - stats.total} trades remaining</span>
            <span className="font-bold text-cyan-400">{Math.round((stats.total / 100) * 100)}%</span>
          </div>
        </div>

        {/* Win Rate & P&L Card */}
        <div className="premium-card p-4 border border-border space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Win Rate & P&L</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className={`text-xs font-mono font-bold ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}
          </div>
          <div className="text-[11px] text-muted">
            {stats.wins} Wins • {stats.losses} Losses
          </div>
        </div>

        {/* Closed By Breakdown (TP=Green, SL=Red, User=Black) */}
        <div className="premium-card p-4 border border-border space-y-1.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Closed By Breakdown</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              TP: {stats.tpCount}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              SL: {stats.slCount}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-black text-white dark:bg-black dark:text-zinc-100 border border-zinc-700">
              User: {stats.userCount}
            </span>
          </div>
          <div className="text-[11px] text-muted">
            {stats.tpCount > 0 ? `${Math.round((stats.tpCount / (stats.total || 1)) * 100)}% TP hit rate` : 'Tracking exit discipline'}
          </div>
        </div>

        {/* Discipline / Star Rating & Psychology */}
        <div className="premium-card p-4 border border-border space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Avg Discipline / Stars</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono flex items-center gap-1.5">
            <span>{stats.avgStars > 0 ? stats.avgStars.toFixed(1) : '-'}</span>
            <span className="text-amber-400 text-lg">★</span>
          </div>
          <div className="text-[11px] text-muted flex items-center gap-1">
            <Brain className="w-3 h-3 text-cyan-400" />
            <span>
              {stats.topMistakes.length > 0
                ? `Frequent: ${stats.topMistakes[0][0]}`
                : '100% disciplined execution'}
            </span>
          </div>
        </div>
      </div>

      {/* Table Filter & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by symbol, notes, or emotions..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground focus:outline-none"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Winners Only</option>
            <option value="LOSS">Losses Only</option>
          </select>

          {/* Closed By Filter */}
          <select
            value={closedByFilter}
            onChange={e => setClosedByFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground focus:outline-none"
          >
            <option value="ALL">All Exits</option>
            <option value="TP">Closed by TP (Green)</option>
            <option value="SL">Closed by SL (Red)</option>
            <option value="User">Closed by User (Black)</option>
          </select>

          {/* Sort Order */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'))}
            className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
          >
            {sortOrder === 'ASC' ? '#1 → #100 (Chronological)' : '#100 → #1 (Latest First)'}
          </button>
        </div>
      </div>

      {/* 100 TRADES JOURNAL TABLE */}
      <div className="premium-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-black/5 dark:bg-white/[0.02] text-muted uppercase tracking-wider font-bold text-[10px]">
                <th className="py-3 px-3.5">#</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Symbol & Side</th>
                <th className="py-3 px-3 text-right">Lots</th>
                <th className="py-3 px-3 text-right">Entry</th>
                <th className="py-3 px-3 text-right">Exit</th>
                <th className="py-3 px-3 text-right">Stop Loss</th>
                <th className="py-3 px-3 text-right">Take Profit</th>
                <th className="py-3 px-3 text-center">Closed By</th>
                <th className="py-3 px-3 text-center">Star Rating</th>
                <th className="py-3 px-3 text-right">Net P&L</th>
                <th className="py-3 px-3 text-center">R:R</th>
                <th className="py-3 px-3">Psychology & Mistakes</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedTrades.map((t, idx) => {
                const tradeNum = sortOrder === 'ASC'
                  ? challengeTrades.indexOf(t) + 1
                  : challengeTrades.indexOf(t) + 1;
                const isWin = t.netPnl > 0.01;
                const isLoss = t.netPnl < -0.01;
                const closedBy = inferClosedBy(t);
                const rating = t.executionRating ?? (isWin ? 5 : 3);

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                  >
                    {/* 1. Trade # */}
                    <td className="py-3 px-3.5 font-mono font-bold text-cyan-400">
                      #{tradeNum}
                    </td>

                    {/* 2. Date & Time */}
                    <td className="py-3 px-3 text-muted font-mono">
                      {new Date(t.openTime).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </td>

                    {/* 3. Symbol & Side */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <AssetLogo symbol={t.symbol} size="xs" />
                        <Link
                          to={`/trades/${t.id}`}
                          className="font-bold text-foreground hover:text-cyan-400 transition-colors"
                        >
                          {formatSymbolDisplay(t.symbol)}
                        </Link>
                        <Badge
                          variant={t.direction === 'BUY' ? 'buy' : 'sell'}
                          size="sm"
                        >
                          {t.direction}
                        </Badge>
                      </div>
                    </td>

                    {/* 4. Lots */}
                    <td className="py-3 px-3 font-mono text-right text-foreground">
                      {t.lotSize}
                    </td>

                    {/* 5. Entry */}
                    <td className="py-3 px-3 font-mono text-right text-foreground">
                      {t.entryPrice.toFixed(2)}
                    </td>

                    {/* 6. Exit */}
                    <td className="py-3 px-3 font-mono text-right text-foreground">
                      {t.exitPrice ? (
                        t.exitPrice.toFixed(2)
                      ) : (
                        <span className="text-sky-400 font-bold">Running</span>
                      )}
                    </td>

                    {/* 7. Stop Loss */}
                    <td className="py-3 px-3 font-mono text-right text-rose-400">
                      {t.stopLoss ? t.stopLoss.toFixed(2) : '-'}
                    </td>

                    {/* 8. Take Profit */}
                    <td className="py-3 px-3 font-mono text-right text-emerald-400">
                      {t.takeProfit ? t.takeProfit.toFixed(2) : '-'}
                    </td>

                    {/* 9. Closed By (TP=Green, SL=Red, User=Black) */}
                    <td className="py-3 px-3 text-center">
                      <select
                        value={closedBy}
                        onChange={e => handleUpdateClosedBy(t.id, e.target.value as any)}
                        className={`text-[11px] font-black px-2.5 py-1 rounded-md cursor-pointer transition-all focus:outline-none appearance-none text-center ${
                          closedBy === 'TP'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25'
                            : closedBy === 'SL'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 hover:bg-rose-500/25'
                            : 'bg-black text-white dark:bg-black dark:text-zinc-100 border border-zinc-700 hover:border-zinc-500'
                        }`}
                        title="Click to change Closed By (TP, SL, or User)"
                      >
                        <option value="TP" className="bg-surface text-emerald-400 font-bold">TP (Take Profit)</option>
                        <option value="SL" className="bg-surface text-rose-400 font-bold">SL (Stop Loss)</option>
                        <option value="User" className="bg-surface text-foreground font-bold">User (Manual)</option>
                      </select>
                    </td>

                    {/* 10. Star Rating (Execution / Discipline) */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleUpdateRating(t.id, star)}
                            className={`text-sm transition-transform hover:scale-125 cursor-pointer ${
                              star <= rating ? 'text-amber-400' : 'text-border hover:text-amber-400/50'
                            }`}
                            title={`Rate trade ${star} stars`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </td>

                    {/* 11. Net P&L */}
                    <td className="py-3 px-3 font-mono font-bold text-right">
                      <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-muted'}>
                        {formatCurrency(t.netPnl)}
                      </span>
                    </td>

                    {/* 12. R:R */}
                    <td className="py-3 px-3 font-mono text-center text-muted">
                      {t.realizedRR !== undefined ? (
                        <span className="text-foreground font-bold">{t.realizedRR}R</span>
                      ) : t.plannedRR ? (
                        `1:${t.plannedRR} (P)`
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* 13. Psychology & Mistakes */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-foreground font-medium">
                          {t.emotionalState || 'Disciplined'}
                        </span>
                        {(t.mistakeTags || []).map(m => (
                          <span
                            key={m}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium"
                          >
                            {m}
                          </span>
                        ))}
                        {t.notes && (
                          <span className="text-[10px] text-muted truncate max-w-[120px]" title={t.notes}>
                            {t.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 14. Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/replay?tradeId=${t.id}`}
                          className="p-1 rounded text-muted hover:text-cyan-400 transition-colors"
                          title="Replay Trade"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/trades/${t.id}`}
                          className="p-1 rounded text-muted hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Placeholder row if challenge has 0 trades yet */}
              {displayedTrades.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-muted text-xs space-y-2">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                      <Target className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-foreground">
                      No trades recorded for this challenge yet
                    </p>
                    <p className="text-[11px] text-muted max-w-sm mx-auto">
                      Trades opened on or after <strong>{challenge.startDate}</strong> will automatically appear here as Trade #1, #2, etc.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Challenge Footer / Remaining Slots Indicator */}
        {challengeTrades.length > 0 && challengeTrades.length < 100 && (
          <div className="p-3 bg-black/5 dark:bg-white/[0.02] border-t border-border flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                Next: <strong>Trade #{challengeTrades.length + 1}</strong> awaiting execution
              </span>
            </div>
            <span className="font-mono text-[11px]">
              {100 - challengeTrades.length} trades left to complete 100 Trades Challenge
            </span>
          </div>
        )}
      </div>

      {/* Challenge Setup / Reset Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="100 Trades Challenge Setup"
          maxWidth="md"
        >
          <form onSubmit={handleSaveChallenge} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Challenge Name
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. 100 Trades Discipline Challenge"
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={formStartDate}
                  onChange={e => setFormStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Account Filter
                </label>
                <select
                  value={formAccountId}
                  onChange={e => setFormAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Discipline Goals / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="e.g. Only A+ setups, strict 1% risk per trade."
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Save Challenge
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
