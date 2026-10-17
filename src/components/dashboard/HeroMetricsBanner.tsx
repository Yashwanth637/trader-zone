import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SummaryStats, formatCurrency } from '../../lib/calculations';
import { Trade, TradingAccount } from '../../types/trade';
import { UserProfile } from '../../types/settings';
import { User } from '../../types/auth';
import {
  Wallet,
  Trophy,
  Flame,
  TrendingUp,
  TrendingDown,
  Share2
} from 'lucide-react';
import { MonthlyShareModal } from './MonthlyShareModal';

interface HeroMetricsBannerProps {
  stats: SummaryStats;
  trades: Trade[];
  activeAccount?: TradingAccount;
  accounts: TradingAccount[];
  profile?: UserProfile;
  user?: User | null;
}

/**
 * Vending machine / slot machine style running number counter
 * Rapidly counts from 0 to the target value with deceleration and exact decimal precision.
 * Uses direct DOM ref updating to prevent component tree re-rendering artifacts.
 */
export const VendingPnlCounter: React.FC<{
  targetValue: number;
  duration?: number;
}> = ({ targetValue, duration = 1600 }) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number | null = null;
    const startVal = 0;

    const formatVal = (v: number) => {
      const isNeg = targetValue < -0.001;
      const isPos = targetValue > 0.001;
      const absVal = Math.abs(v);
      const formattedAbs = absVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return `${isNeg ? '-' : isPos ? '+' : ''}$${formattedAbs}`;
    };

    if (spanRef.current) {
      spanRef.current.textContent = formatVal(0);
    }

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic deceleration curve
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = startVal + (targetValue - startVal) * ease;

      if (spanRef.current) {
        spanRef.current.textContent = formatVal(val);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else if (spanRef.current) {
        spanRef.current.textContent = formatVal(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]);

  const isNeg = targetValue < -0.001;
  const isPos = targetValue > 0.001;
  const initialFormatted = Math.abs(0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <span ref={spanRef} className="tabular-nums font-mono font-black inline-block">
      {isNeg ? '-' : isPos ? '+' : ''}${initialFormatted}
    </span>
  );
};

export const HeroMetricsBanner: React.FC<HeroMetricsBannerProps> = ({
  stats,
  trades,
  activeAccount,
  accounts,
  profile,
  user
}) => {
  // Time-based greeting (morning / afternoon / evening)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  // User display name
  const displayName = profile?.name || user?.name || 'Trader';

  // Monthly Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Calculate Balance (active account balance or aggregate)
  const totalBalance = useMemo(() => {
    if (activeAccount) return activeAccount.currentBalance;
    return accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [activeAccount, accounts]);

  // Compute Today's P&L, This Month's P&L, and Best Day
  const { todayPnl, thisMonthPnl, bestDayPnl } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const monthPrefix = todayStr.slice(0, 7); // YYYY-MM

    const dailyMap: Record<string, number> = {};
    let today = 0;
    let thisMonth = 0;

    const closed = trades.filter(t => t.status === 'CLOSED');

    closed.forEach(t => {
      const d = t.closeTime || t.openTime;
      if (!d) return;
      const dateKey = new Date(d).toLocaleDateString('en-CA');
      const pnl = Number(t.netPnl) || 0;

      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + pnl;

      if (dateKey === todayStr) {
        today += pnl;
      }
      if (dateKey.startsWith(monthPrefix)) {
        thisMonth += pnl;
      }
    });

    let bestDay = 0;
    Object.values(dailyMap).forEach(dayPnl => {
      if (dayPnl > bestDay) bestDay = dayPnl;
    });

    return {
      todayPnl: today,
      thisMonthPnl: thisMonth,
      bestDayPnl: bestDay
    };
  }, [trades]);

  // Streak calculation (e.g. 5L, 3W, 0)
  const streakDisplay = useMemo(() => {
    const streak = stats.currentStreak;
    if (!streak || streak.type === 'none' || streak.count === 0) return '0';
    return `${streak.count}${streak.type === 'win' ? 'W' : 'L'}`;
  }, [stats.currentStreak]);

  const isStreakWin = stats.currentStreak?.type === 'win';
  const isStreakLoss = stats.currentStreak?.type === 'loss';

  const isTotalPos = stats.netPnl > 0.001;
  const isTotalNeg = stats.netPnl < -0.001;

  const isTodayPos = todayPnl > 0.001;
  const isTodayNeg = todayPnl < -0.001;

  const isMonthPos = thisMonthPnl > 0.001;
  const isMonthNeg = thisMonthPnl < -0.001;

  return (
    <div className="space-y-4">
      {/* TOP HERO BANNER (Image 1 Style - Seamless Theme Glow without dirty rect clipping) */}
      <div
        style={{
          backgroundImage: isTotalPos
            ? 'radial-gradient(circle 320px at 12% 28%, rgba(16, 185, 129, 0.14), transparent 75%)'
            : isTotalNeg
            ? 'radial-gradient(circle 320px at 12% 28%, rgba(244, 63, 94, 0.14), transparent 75%)'
            : 'radial-gradient(circle 320px at 12% 28%, rgba(139, 92, 246, 0.12), transparent 75%)'
        }}
        className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#0b0b0e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-2xl relative overflow-hidden transition-colors"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Block: Greeting + Name + SWAPPED POSITION: Giant Animated TOTAL P&L */}
          <div className="space-y-3">
            <div>
              <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium block">
                {greeting}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {displayName}
              </h2>
            </div>

            <div className="space-y-1 pt-1">
              {/* Stat Pill Label */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]">
                {isTotalPos ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  TOTAL P&L
                </span>
              </div>

              {/* Giant Animated Vending Machine Value (clean text-shadow without layer-promoting drop-shadow) */}
              <div
                className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight ${
                  isTotalPos
                    ? 'text-emerald-600 dark:text-emerald-400 dark:[text-shadow:0_0_30px_rgba(52,211,153,0.3)]'
                    : isTotalNeg
                    ? 'text-rose-600 dark:text-rose-400 dark:[text-shadow:0_0_30px_rgba(248,113,113,0.3)]'
                    : 'text-slate-900 dark:text-slate-200'
                }`}
              >
                <VendingPnlCounter targetValue={stats.netPnl} duration={1600} />
              </div>
            </div>
          </div>

          {/* Right Block: 4 Mini Cards (Balance, Swapped TODAY'S P&L, Best Day, Streak) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 lg:gap-3.5 shrink-0">
            {/* 1. BALANCE */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#121217] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] transition-colors space-y-1.5 min-w-[125px]">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>BALANCE</span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white tracking-tight truncate">
                {formatCurrency(totalBalance)}
              </div>
            </div>

            {/* 2. SWAPPED POSITION: TODAY'S P&L */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#121217] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] transition-colors space-y-1.5 min-w-[125px]">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                {isTodayPos ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                )}
                <span>TODAY'S P&L</span>
              </div>
              <div
                className={`text-base sm:text-lg font-black font-mono tracking-tight truncate ${
                  isTodayPos
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isTodayNeg
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {isTodayPos ? '+' : ''}
                {formatCurrency(todayPnl)}
              </div>
            </div>

            {/* 3. BEST DAY */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#121217] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] transition-colors space-y-1.5 min-w-[125px]">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400/90 text-[10px] font-bold uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>BEST DAY</span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-300 tracking-tight truncate">
                {bestDayPnl > 0 ? `+${formatCurrency(bestDayPnl)}` : '$0.00'}
              </div>
            </div>

            {/* 4. STREAK */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#121217] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] transition-colors space-y-1.5 min-w-[105px]">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <Flame
                  className={`w-3.5 h-3.5 ${
                    isStreakWin
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isStreakLoss
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span>STREAK</span>
              </div>
              <div
                className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                  isStreakWin
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isStreakLoss
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {streakDisplay}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6-CARD SECONDARY METRICS ROW (Image 1 Bottom Row - Theme Adaptive) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. WIN RATE */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b0b0e] border border-slate-200/90 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] shadow-sm dark:shadow-none transition-colors space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            WIN RATE
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
            {stats.winRate.toFixed(0)}%
          </div>
        </div>

        {/* 2. TOTAL TRADES */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b0b0e] border border-slate-200/90 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] shadow-sm dark:shadow-none transition-colors space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            TOTAL TRADES
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
            {stats.totalTrades}
          </div>
        </div>

        {/* 3. BIGGEST WIN */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b0b0e] border border-slate-200/90 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] shadow-sm dark:shadow-none transition-colors space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            BIGGEST WIN
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
            {stats.largestWin > 0 ? `+${formatCurrency(stats.largestWin)}` : '$0.00'}
          </div>
        </div>

        {/* 4. AVG WIN */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b0b0e] border border-slate-200/90 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] shadow-sm dark:shadow-none transition-colors space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            AVG WIN
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
            {stats.avgWin > 0 ? `+${formatCurrency(stats.avgWin)}` : '$0.00'}
          </div>
        </div>

        {/* 5. AVG LOSS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b0b0e] border border-slate-200/90 dark:border-white/[0.06] hover:border-slate-300 hover:dark:border-white/[0.12] shadow-sm dark:shadow-none transition-colors space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            AVG LOSS
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight truncate">
            {stats.avgLoss > 0 ? formatCurrency(stats.avgLoss) : '$0.00'}
          </div>
        </div>

        {/* 6. THIS MONTH */}
        <div
          onClick={() => setIsShareModalOpen(true)}
          className="p-4 rounded-2xl bg-white dark:bg-[#0b0b0e] border border-slate-200/90 dark:border-white/[0.06] hover:border-primary/40 hover:dark:border-primary/50 shadow-sm dark:shadow-none transition-all space-y-1 relative cursor-pointer group"
          title="Click to view & share monthly performance overview"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block group-hover:text-primary transition-colors">
              THIS MONTH
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsShareModalOpen(true);
              }}
              title="Share Monthly Overview"
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 group-hover:text-primary transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight truncate ${
              isMonthPos
                ? 'text-emerald-600 dark:text-emerald-400'
                : isMonthNeg
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {isMonthPos ? '+' : ''}
            {formatCurrency(thisMonthPnl)}
          </div>
        </div>
      </div>

      {/* Monthly Performance Overview Share Modal */}
      <MonthlyShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trades={trades}
        activeAccount={activeAccount}
        profile={profile}
        user={user}
        thisMonthPnl={thisMonthPnl}
      />
    </div>
  );
};
