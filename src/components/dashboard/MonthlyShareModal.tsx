import React, { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Trade, TradingAccount } from '../../types/trade';
import { UserProfile } from '../../types/settings';
import { User } from '../../types/auth';
import { formatCurrency } from '../../lib/calculations';
import { useTheme } from '../../context/ThemeContext';
import { formatSymbolDisplay } from '../common/AssetLogo';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Calendar,
  Trophy,
  BarChart3,
  Flame,
  Sun,
  Moon,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface MonthlyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  activeAccount?: TradingAccount;
  profile?: UserProfile;
  user?: User | null;
  thisMonthPnl: number;
}

export const MonthlyShareModal: React.FC<MonthlyShareModalProps> = ({
  isOpen,
  onClose,
  trades,
  activeAccount,
  profile,
  user,
  thisMonthPnl
}) => {
  const { theme } = useTheme();
  const isAppLight = theme === 'light';

  const cardRef = useRef<HTMLDivElement>(null);
  const [cardAppearance, setCardAppearance] = useState<'auto' | 'dark' | 'light' | 'violet'>('auto');
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Month information
  const { monthName, currentMonthStr } = useMemo(() => {
    const now = new Date();
    return {
      monthName: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      currentMonthStr: now.toLocaleDateString('en-CA').slice(0, 7) // 'YYYY-MM'
    };
  }, []);

  // Filter closed trades for the current calendar month
  const monthStats = useMemo(() => {
    const monthTrades = trades.filter(t => {
      if (t.status !== 'CLOSED') return false;
      const d = t.closeTime || t.openTime;
      if (!d) return false;
      const dateKey = new Date(d).toLocaleDateString('en-CA');
      return dateKey.startsWith(currentMonthStr);
    });

    const totalTrades = monthTrades.length;
    const wins = monthTrades.filter(t => (Number(t.netPnl) || 0) > 0);
    const losses = monthTrades.filter(t => (Number(t.netPnl) || 0) < 0);
    const breakeven = monthTrades.filter(t => (Number(t.netPnl) || 0) === 0);

    const winCount = wins.length;
    const lossCount = losses.length;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

    const grossProfit = wins.reduce((sum, t) => sum + (Number(t.netPnl) || 0), 0);
    const grossLoss = losses.reduce((sum, t) => sum + Math.abs(Number(t.netPnl) || 0), 0);
    const netPnl = thisMonthPnl !== undefined ? thisMonthPnl : grossProfit - grossLoss;

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;

    let bestTrade = 0;
    let worstTrade = 0;
    monthTrades.forEach(t => {
      const p = Number(t.netPnl) || 0;
      if (p > bestTrade) bestTrade = p;
      if (p < worstTrade) worstTrade = p;
    });

    // Daily breakdown for traded days and day-level win rate
    const dailyMap: Record<string, number> = {};
    monthTrades.forEach(t => {
      const d = t.closeTime || t.openTime;
      if (!d) return;
      const dateKey = new Date(d).toLocaleDateString('en-CA');
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + (Number(t.netPnl) || 0);
    });

    const tradedDays = Object.keys(dailyMap).length;
    const greenDays = Object.values(dailyMap).filter(p => p > 0).length;
    const redDays = Object.values(dailyMap).filter(p => p < 0).length;
    const dailyWinRate = tradedDays > 0 ? (greenDays / tradedDays) * 100 : 0;

    // Top traded symbol
    const symbolMap: Record<string, { count: number; pnl: number }> = {};
    monthTrades.forEach(t => {
      let s = (t.symbol || 'OTHER').toUpperCase().trim();
      if (s.startsWith('XAUUSD') || s.startsWith('XAUTUSD') || s === 'XAU') {
        s = 'GOLD';
      }
      if (!symbolMap[s]) symbolMap[s] = { count: 0, pnl: 0 };
      symbolMap[s].count += 1;
      symbolMap[s].pnl += Number(t.netPnl) || 0;
    });

    let topSymbol = '—';
    let topSymbolCount = 0;
    let topSymbolPnl = 0;
    Object.entries(symbolMap).forEach(([sym, data]) => {
      if (data.count > topSymbolCount) {
        topSymbol = sym;
        topSymbolCount = data.count;
        topSymbolPnl = data.pnl;
      }
    });

    return {
      totalTrades,
      winCount,
      lossCount,
      breakevenCount: breakeven.length,
      winRate,
      grossProfit,
      grossLoss,
      netPnl,
      profitFactor,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      tradedDays,
      greenDays,
      redDays,
      dailyWinRate,
      topSymbol,
      topSymbolCount,
      topSymbolPnl
    };
  }, [trades, currentMonthStr, thisMonthPnl]);

  // Determine active visual theme for the card
  const activeMode: 'light' | 'dark' | 'violet' = useMemo(() => {
    if (cardAppearance === 'violet') return 'violet';
    if (cardAppearance === 'dark') return 'dark';
    if (cardAppearance === 'light') return 'light';
    return isAppLight ? 'light' : 'dark';
  }, [cardAppearance, isAppLight]);

  const isNetPos = monthStats.netPnl > 0.001;
  const isNetNeg = monthStats.netPnl < -0.001;
  const displayName = profile?.name || user?.name || 'Trader';
  const accountName = activeAccount?.name || 'Main Portfolio';

  // Render high-res canvas via html2canvas
  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // Fallback gracefully
      }
    }
    await new Promise(r => setTimeout(r, 60));

    const el = cardRef.current;
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    return await html2canvas(el, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      width,
      height
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    setStatusMessage(null);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `traderzone-monthly-overview-${currentMonthStr}.png`;
      link.href = dataUrl;
      link.click();

      setStatusMessage('High-resolution PNG saved successfully!');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('Download error:', err);
      setStatusMessage('Failed to download image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyOrShare = async () => {
    setCopying(true);
    setStatusMessage(null);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const blob = await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/png', 1.0));
      if (!blob) throw new Error('Blob generation failed');

      const fileName = `traderzone-monthly-overview-${currentMonthStr}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Trader Zone - ${monthName} Performance Overview`,
          text: `My ${monthName} trading recap: ${formatCurrency(monthStats.netPnl)} (${monthStats.winRate.toFixed(0)}% Win Rate) on Trader Zone!`,
          files: [file]
        });
        setStatusMessage('Shared successfully!');
      } else if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setStatusMessage('Image copied to clipboard! Paste directly into Discord, X, or Telegram.');
      } else {
        handleDownload();
      }
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('Share error:', err);
      setStatusMessage('Copy failed. Downloading PNG instead...');
      handleDownload();
    } finally {
      setCopying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Monthly Performance Overview</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  {monthName}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Shareable high-resolution recap card designed for social sharing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body & Controls */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[calc(88vh-80px)] overflow-y-auto">
          {/* Theme Appearance Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Card Style
            </span>
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]">
              <button
                onClick={() => setCardAppearance('auto')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  cardAppearance === 'auto'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Auto</span>
              </button>
              <button
                onClick={() => setCardAppearance('dark')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  cardAppearance === 'dark'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-slate-300" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setCardAppearance('light')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  cardAppearance === 'light'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setCardAppearance('violet')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  cardAppearance === 'violet'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Violet</span>
              </button>
            </div>
          </div>

          {/* Status Message Notification */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* LIVE PREVIEW OF THE MONTHLY SHARE CARD */}
          <div className="flex justify-center p-1">
            <div
              ref={cardRef}
              data-share-card="true"
              className={`w-full max-w-xl rounded-3xl p-6 sm:p-7 transition-all relative overflow-hidden select-none ${
                activeMode === 'light'
                  ? 'bg-gradient-to-br from-white via-slate-50 to-slate-100/90 text-slate-900 border border-slate-200 shadow-xl'
                  : activeMode === 'violet'
                  ? 'bg-gradient-to-br from-[#1a0f35] via-[#100826] to-[#080415] text-white border border-purple-500/40 shadow-2xl'
                  : 'bg-gradient-to-br from-[#13161c] via-[#0b0c10] to-[#06070a] text-white border border-white/[0.12] shadow-2xl'
              }`}
            >
              {/* Decorative ambient background blur */}
              <div
                className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
                  activeMode === 'light'
                    ? isNetPos
                      ? 'bg-emerald-200/40'
                      : 'bg-rose-200/40'
                    : isNetPos
                    ? 'bg-emerald-500/15'
                    : 'bg-rose-500/15'
                }`}
              />
              <div
                className={`absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
                  activeMode === 'violet' ? 'bg-purple-600/20' : 'bg-primary/10'
                }`}
              />

              <div className="relative z-10 space-y-5">
                {/* 1. Header: Branding & User Badge */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-xs">
                        TZ
                      </div>
                      <span
                        className={`text-xs font-black tracking-widest uppercase ${
                          activeMode === 'light' ? 'text-slate-800' : 'text-slate-200'
                        }`}
                      >
                        TRADER ZONE
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          activeMode === 'light'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        RECAP
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`text-sm font-black ${
                          activeMode === 'light' ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {displayName}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span
                        className={`text-[10px] font-medium ${
                          activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        · {accountName}
                      </span>
                    </div>
                  </div>

                  {/* Month Pill Badge */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shrink-0 ${
                      activeMode === 'light'
                        ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
                        : activeMode === 'violet'
                        ? 'bg-purple-500/20 border-purple-500/30 text-purple-200'
                        : 'bg-white/[0.06] border-white/10 text-slate-200'
                    }`}
                  >
                    {monthName}
                  </div>
                </div>

                {/* 2. Hero Net P&L Figure (No mini cards, direct coordinate/flex layout) */}
                <div className="pt-2 pb-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      MONTHLY NET P&L
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          monthStats.winRate >= 50
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {monthStats.winRate.toFixed(0)}% WIN RATE
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          activeMode === 'light'
                            ? 'bg-slate-100 border-slate-200 text-slate-700'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        {monthStats.profitFactor.toFixed(2)} PF
                      </span>
                    </div>
                  </div>

                  {/* Giant PnL Typography */}
                  <div className="flex items-center gap-2">
                    {isNetPos ? (
                      <ArrowUpRight className="w-8 h-8 text-emerald-500 shrink-0" />
                    ) : isNetNeg ? (
                      <ArrowDownRight className="w-8 h-8 text-rose-500 shrink-0" />
                    ) : null}
                    <div
                      className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                        isNetPos
                          ? activeMode === 'light'
                            ? 'text-emerald-600'
                            : 'text-emerald-400 drop-shadow-[0_2px_12px_rgba(52,211,153,0.3)]'
                          : isNetNeg
                          ? activeMode === 'light'
                            ? 'text-rose-600'
                            : 'text-rose-400 drop-shadow-[0_2px_12px_rgba(248,113,113,0.3)]'
                          : activeMode === 'light'
                          ? 'text-slate-900'
                          : 'text-slate-100'
                      }`}
                    >
                      {isNetPos ? '+' : ''}
                      {formatCurrency(monthStats.netPnl)}
                    </div>
                  </div>

                  {/* Win / Loss Visual Split Progress Bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                      <span className="text-emerald-500">{monthStats.winCount} Wins</span>
                      <span
                        className={activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'}
                      >
                        {monthStats.totalTrades} Total Trades
                      </span>
                      <span className="text-rose-500">{monthStats.lossCount} Losses</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-white/10">
                      <div
                        style={{ width: `${Math.max(monthStats.totalTrades > 0 ? (monthStats.winCount / monthStats.totalTrades) * 100 : 50, 4)}%` }}
                        className="h-full bg-emerald-500 transition-all duration-300"
                      />
                      <div
                        style={{ width: `${Math.max(monthStats.totalTrades > 0 ? (monthStats.lossCount / monthStats.totalTrades) * 100 : 50, 4)}%` }}
                        className="h-full bg-rose-500 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Primary Metrics Grid (No mini cards, direct coordinate columns) */}
                <div
                  className={`grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t ${
                    activeMode === 'light' ? 'border-slate-200/80' : 'border-white/[0.08]'
                  }`}
                >
                  {/* Total Trades */}
                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider block ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      TOTAL TRADES
                    </span>
                    <div
                      className={`text-lg font-black font-mono mt-0.5 ${
                        activeMode === 'light' ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {monthStats.totalTrades}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {monthStats.winCount}W · {monthStats.lossCount}L
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider block ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      WIN RATE
                    </span>
                    <div
                      className={`text-lg font-black font-mono mt-0.5 ${
                        activeMode === 'light' ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {monthStats.winRate.toFixed(0)}%
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Daily: {monthStats.dailyWinRate.toFixed(0)}%
                    </span>
                  </div>

                  {/* Best Trade */}
                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider block ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      BEST TRADE
                    </span>
                    <div className="text-lg font-black font-mono text-emerald-500 mt-0.5 truncate">
                      {monthStats.bestTrade > 0 ? `+${formatCurrency(monthStats.bestTrade)}` : '$0.00'}
                    </div>
                    <span className="text-[10px] text-emerald-500/80 font-mono">
                      Top Win
                    </span>
                  </div>

                  {/* Worst Trade */}
                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider block ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      WORST TRADE
                    </span>
                    <div className="text-lg font-black font-mono text-rose-500 mt-0.5 truncate">
                      {monthStats.worstTrade < 0 ? formatCurrency(monthStats.worstTrade) : '$0.00'}
                    </div>
                    <span className="text-[10px] text-rose-500/80 font-mono">
                      Max Drawdown
                    </span>
                  </div>
                </div>

                {/* 4. Secondary Insights Row */}
                <div
                  className={`grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t ${
                    activeMode === 'light' ? 'border-slate-200/80' : 'border-white/[0.08]'
                  }`}
                >
                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      Avg Win
                    </span>
                    <div className="text-xs font-mono font-bold text-emerald-500">
                      {monthStats.avgWin > 0 ? `+${formatCurrency(monthStats.avgWin)}` : '$0.00'}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      Avg Loss
                    </span>
                    <div className="text-xs font-mono font-bold text-rose-500">
                      {monthStats.avgLoss > 0 ? formatCurrency(monthStats.avgLoss) : '$0.00'}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      Traded Days
                    </span>
                    <div
                      className={`text-xs font-mono font-bold ${
                        activeMode === 'light' ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {monthStats.greenDays}G · {monthStats.redDays}R ({monthStats.tradedDays}d)
                    </div>
                  </div>

                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        activeMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      Top Symbol
                    </span>
                    <div
                      className={`text-xs font-mono font-bold ${
                        activeMode === 'light' ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {formatSymbolDisplay(monthStats.topSymbol)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({monthStats.topSymbolCount}t)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Footer Watermark */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="font-mono">traderzone.app</span>
                  <span>Verified Performance Journal</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Exported as 3x Retina PNG for crisp clarity on Twitter, Discord & Telegram.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyOrShare}
              disabled={copying || downloading}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {copying ? (
                <span>Generating...</span>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading || copying}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.06] text-slate-800 dark:text-white hover:bg-slate-100 hover:dark:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {downloading ? (
                <span>Exporting...</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
