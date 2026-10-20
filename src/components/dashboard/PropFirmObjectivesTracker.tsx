import React from 'react';
import { Link } from 'react-router-dom';
import { TradingAccount, Trade } from '../../types/trade';
import { calculatePropStageMetrics, PropStageMetrics } from '../../lib/propFirmRules';
import { formatCurrency } from '../../lib/calculations';
import { Award, ArrowUpRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PropFirmObjectivesTrackerProps {
  account: TradingAccount;
  trades: Trade[];
}

export const PropFirmObjectivesTracker: React.FC<PropFirmObjectivesTrackerProps> = ({
  account,
  trades
}) => {
  const currentStage = account.propFirmData?.currentStage || 'stage1';
  const metrics: PropStageMetrics = React.useMemo(() => {
    return calculatePropStageMetrics(account, trades, currentStage);
  }, [account, trades, currentStage]);

  // SVG circular ring helper
  const renderCircleProgress = (
    percent: number,
    centerTextLine1: string,
    centerTextLine2?: string,
    color: string = '#10b981',
    bgColor: string = 'rgba(255,255,255,0.08)'
  ) => {
    const radius = 26;
    const strokeWidth = 3.5;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-border/60 dark:text-white/[0.08]"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-black leading-tight text-foreground font-mono">
            {centerTextLine1}
          </span>
          {centerTextLine2 && (
            <span className="text-[9px] font-semibold text-muted leading-tight">
              {centerTextLine2}
            </span>
          )}
        </div>
      </div>
    );
  };

  const isFunded = currentStage === 'funded';

  return (
    <div className="premium-card p-5 space-y-4 border border-border/80 shadow-md">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-foreground tracking-tight">
                {account.name} · {metrics.rule.name}
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Prop Firm
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {metrics.rule.subtitle}
            </p>
          </div>
        </div>

        <Link
          to={`/broker-hub/account/${account.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>Open Evaluation Portal</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 5 Circular Objectives Tracker Cards (Exact Image 3 Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Profit Target */}
        <div className="p-4 rounded-2xl bg-surface border border-border/60 hover:border-primary/40 transition-all flex items-center gap-3.5 shadow-sm">
          {renderCircleProgress(
            isFunded ? 100 : metrics.targetDonePercent,
            isFunded ? '—' : `${Math.round(metrics.targetDonePercent)}%`,
            isFunded ? 'payout' : 'done',
            metrics.isTargetAchieved ? '#10b981' : '#6366f1'
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-muted">Profit target</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isFunded || metrics.isTargetAchieved
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-muted/15 text-muted border border-border'
                }`}
              >
                {isFunded ? 'Active' : metrics.isTargetAchieved ? 'Complete' : 'In progress'}
              </span>
            </div>
            <div className="text-sm font-black text-foreground truncate font-mono">
              {isFunded
                ? `${formatCurrency(metrics.realizedPnl)} net`
                : metrics.targetRemaining <= 0
                ? 'Goal Reached!'
                : `${formatCurrency(metrics.targetRemaining)} to go`}
            </div>
            <div className="text-[11px] text-muted truncate">
              {isFunded
                ? 'Profit split / payouts'
                : `${formatCurrency(metrics.realizedPnl)} of ${formatCurrency(metrics.targetAmount || 0)} (${metrics.rule.profitTargetPercent}%)`}
            </div>
          </div>
        </div>

        {/* Card 2: Trading Days */}
        <div className="p-4 rounded-2xl bg-surface border border-border/60 hover:border-emerald-500/40 transition-all flex items-center gap-3.5 shadow-sm">
          {renderCircleProgress(
            (metrics.qualifyingDaysCount / metrics.minTradingDays) * 100,
            `${metrics.qualifyingDaysCount}/${metrics.minTradingDays}`,
            'days',
            '#10b981'
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-muted">Trading days</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  metrics.isTradingDaysAchieved
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-muted/15 text-muted border border-border'
                }`}
              >
                {metrics.isTradingDaysAchieved ? 'Complete' : 'In progress'}
              </span>
            </div>
            <div className="text-sm font-black text-foreground truncate font-mono">
              {metrics.isTradingDaysAchieved
                ? 'Complete'
                : `${metrics.minTradingDays - metrics.qualifyingDaysCount} Days Left`}
            </div>
            <div className="text-[11px] text-muted truncate">
              Minimum {metrics.minTradingDays} trading days
            </div>
          </div>
        </div>

        {/* Card 3: Max Loss */}
        <div className="p-4 rounded-2xl bg-surface border border-border/60 hover:border-border transition-all flex items-center gap-3.5 shadow-sm">
          {renderCircleProgress(
            metrics.maxLossUsedPercent,
            `${Math.round(metrics.maxLossUsedPercent)}%`,
            'used',
            metrics.isMaxLossBreached ? '#f43f5e' : metrics.maxLossUsedPercent > 60 ? '#f59e0b' : '#94a3b8'
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-muted">Max loss</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  metrics.isMaxLossBreached
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-muted/15 text-muted border border-border'
                }`}
              >
                {metrics.isMaxLossBreached ? 'Breached' : 'On track'}
              </span>
            </div>
            <div className="text-sm font-black text-foreground truncate font-mono">
              {formatCurrency(metrics.maxLossRemaining)} left
            </div>
            <div className="text-[11px] text-muted truncate">
              of {formatCurrency(metrics.maxTotalLossAmount)} ({metrics.rule.maxTotalLossPercent}%) on equity
            </div>
          </div>
        </div>

        {/* Card 4: Daily Loss */}
        <div className="p-4 rounded-2xl bg-surface border border-border/60 hover:border-border transition-all flex items-center gap-3.5 shadow-sm">
          {renderCircleProgress(
            metrics.dailyLossUsedPercent,
            `${Math.round(metrics.dailyLossUsedPercent)}%`,
            'used',
            metrics.isDailyLossBreached ? '#f43f5e' : metrics.dailyLossUsedPercent > 60 ? '#f59e0b' : '#94a3b8'
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-muted">Daily loss</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  metrics.isDailyLossBreached
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-muted/15 text-muted border border-border'
                }`}
              >
                {metrics.isDailyLossBreached ? 'Breached' : 'On track'}
              </span>
            </div>
            <div className="text-sm font-black text-foreground truncate font-mono">
              {formatCurrency(metrics.dailyLossRemaining)} left today
            </div>
            <div className="text-[11px] text-muted truncate">
              of {formatCurrency(metrics.maxDailyLossAmount)} ({metrics.rule.maxDailyLossPercent}%) from start equity
            </div>
          </div>
        </div>

        {/* Card 5: Sub-1-min Trades / Consistency Cap */}
        <div className="p-4 rounded-2xl bg-surface border border-border/60 hover:border-border transition-all flex items-center gap-3.5 shadow-sm">
          {renderCircleProgress(
            (metrics.sub1MinTradesPercent / 10) * 100,
            `${metrics.sub1MinTradesPercent}%`,
            'of 10%',
            metrics.isSub1MinCompliant ? '#94a3b8' : '#f43f5e'
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-muted">Sub-1-min trades</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  metrics.isSub1MinCompliant
                    ? 'bg-muted/15 text-muted border border-border'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {metrics.isSub1MinCompliant ? 'On track' : 'Breached'}
              </span>
            </div>
            <div className="text-sm font-black text-foreground truncate font-mono">
              {metrics.isSub1MinCompliant ? 'Within cap' : 'Over limit'}
            </div>
            <div className="text-[11px] text-muted truncate">
              {metrics.sub1MinTradesPercent}% of trades · max 10%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
