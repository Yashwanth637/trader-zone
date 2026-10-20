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
    centerTextColor?: string
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
            className="text-border dark:text-white/[0.08]"
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
          <span
            className={`text-[11px] font-black leading-tight font-mono ${
              centerTextColor || 'text-foreground'
            }`}
          >
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
  const isPnlPositive = metrics.realizedPnl >= 0;
  const isPnlNegative = metrics.realizedPnl < 0;

  return (
    <div className="premium-card p-5 space-y-4 shadow-md">
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

      {/* 5 Circular Objectives Tracker Cards (2 Rows: 3 in Row 1, 2 in Row 2) */}
      <div className="space-y-3.5">
        {/* Row 1: 3 Cards (Profit target, Trading days, Max loss) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Profit Target */}
          <div className="p-4 rounded-2xl bg-surface-card border border-border dark:border-white/[0.08] hover:border-white/[0.18] transition-all flex items-center gap-3.5 shadow-sm">
            {renderCircleProgress(
              isFunded
                ? 100
                : isPnlNegative
                ? Math.min(100, Math.round((Math.abs(metrics.realizedPnl) / (metrics.targetAmount || 1)) * 100))
                : metrics.targetDonePercent,
              isFunded
                ? isPnlPositive ? `+${formatCurrency(metrics.realizedPnl)}` : `-${formatCurrency(Math.abs(metrics.realizedPnl))}`
                : isPnlNegative
                ? `-${Math.round((Math.abs(metrics.realizedPnl) / (metrics.targetAmount || 1)) * 100)}%`
                : `${Math.round(metrics.targetDonePercent)}%`,
              isFunded ? 'net pnl' : isPnlNegative ? 'drawdown' : 'done',
              isFunded
                ? isPnlPositive ? '#10b981' : '#f43f5e'
                : isPnlNegative
                ? '#f43f5e'
                : metrics.isTargetAchieved
                ? '#10b981'
                : '#10b981',
              isPnlNegative ? 'text-rose-400' : isPnlPositive && (metrics.realizedPnl > 0 || isFunded) ? 'text-emerald-400' : 'text-foreground'
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-muted">Profit target</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isFunded || metrics.isTargetAchieved
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : isPnlNegative
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-muted/15 text-muted border border-border'
                  }`}
                >
                  {isFunded ? 'Active' : metrics.isTargetAchieved ? 'Complete' : isPnlNegative ? 'Drawdown' : 'In progress'}
                </span>
              </div>
              <div className="text-sm font-black text-foreground truncate font-mono">
                {isFunded ? (
                  isPnlPositive ? (
                    <span className="text-emerald-400">+{formatCurrency(metrics.realizedPnl)} net</span>
                  ) : (
                    <span className="text-rose-400">-{formatCurrency(Math.abs(metrics.realizedPnl))} net</span>
                  )
                ) : metrics.targetRemaining <= 0 ? (
                  <span className="text-emerald-400">Goal Reached!</span>
                ) : (
                  <span>{formatCurrency(metrics.targetRemaining)} to go</span>
                )}
              </div>
              <div className="text-[11px] text-muted truncate">
                {isFunded ? (
                  'Profit split / payouts'
                ) : (
                  <>
                    {isPnlPositive ? (
                      <span className="text-emerald-400 font-bold font-mono">+{formatCurrency(metrics.realizedPnl)}</span>
                    ) : (
                      <span className="text-rose-400 font-bold font-mono">-{formatCurrency(Math.abs(metrics.realizedPnl))}</span>
                    )}{' '}
                    of {formatCurrency(metrics.targetAmount || 0)} ({metrics.rule.profitTargetPercent}%)
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Trading Days */}
          <div className="p-4 rounded-2xl bg-surface-card border border-border dark:border-white/[0.08] hover:border-white/[0.18] transition-all flex items-center gap-3.5 shadow-sm">
            {renderCircleProgress(
              (metrics.qualifyingDaysCount / metrics.minTradingDays) * 100,
              `${metrics.qualifyingDaysCount}/${metrics.minTradingDays}`,
              'days',
              '#10b981',
              metrics.isTradingDaysAchieved ? 'text-emerald-400' : 'text-foreground'
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
                {metrics.isTradingDaysAchieved ? (
                  <span className="text-emerald-400">Complete</span>
                ) : (
                  <span>{metrics.minTradingDays - metrics.qualifyingDaysCount} Days Left</span>
                )}
              </div>
              <div className="text-[11px] text-muted truncate">
                Minimum {metrics.minTradingDays} trading days
              </div>
            </div>
          </div>

          {/* Card 3: Max Loss */}
          <div className="p-4 rounded-2xl bg-surface-card border border-border dark:border-white/[0.08] hover:border-white/[0.18] transition-all flex items-center gap-3.5 shadow-sm">
            {renderCircleProgress(
              metrics.maxLossUsedPercent,
              `${Math.round(metrics.maxLossUsedPercent)}%`,
              'used',
              metrics.maxLossUsedPercent > 0 ? '#f43f5e' : '#10b981',
              metrics.maxLossUsedPercent > 0 ? 'text-rose-400' : 'text-foreground'
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-muted">Max loss</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    metrics.isMaxLossBreached
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : metrics.maxLossUsedPercent > 0
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {metrics.isMaxLossBreached
                    ? 'Breached'
                    : metrics.maxLossUsedPercent > 0
                    ? `-${formatCurrency(metrics.totalDrawdown)}`
                    : '0% Loss'}
                </span>
              </div>
              <div className="text-sm font-black text-foreground truncate font-mono">
                {formatCurrency(metrics.maxLossRemaining)} left
              </div>
              <div className="text-[11px] text-muted truncate">
                of {formatCurrency(metrics.maxTotalLossAmount)} max
                {metrics.totalDrawdown > 0 ? (
                  <>
                    {' · '}
                    <span className="text-rose-400 font-bold font-mono">
                      -{formatCurrency(metrics.totalDrawdown)} loss
                    </span>
                  </>
                ) : (
                  <>
                    {' · '}
                    <span className="text-emerald-400 font-bold font-mono">
                      0 loss
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: 2 Cards (Daily loss, Sub-1-min trades) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 4: Daily Loss */}
          <div className="p-4 rounded-2xl bg-surface-card border border-border dark:border-white/[0.08] hover:border-white/[0.18] transition-all flex items-center gap-3.5 shadow-sm">
            {renderCircleProgress(
              metrics.dailyLossUsedPercent,
              `${Math.round(metrics.dailyLossUsedPercent)}%`,
              'used',
              metrics.dailyLossUsedPercent > 0 ? '#f43f5e' : '#10b981',
              metrics.dailyLossUsedPercent > 0 ? 'text-rose-400' : 'text-foreground'
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-muted">Daily loss</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    metrics.isDailyLossBreached
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : metrics.dailyLossUsedPercent > 0
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {metrics.isDailyLossBreached
                    ? 'Breached'
                    : metrics.dailyLossUsedPercent > 0
                    ? `-${formatCurrency(metrics.todayLoss)}`
                    : '0% Loss'}
                </span>
              </div>
              <div className="text-sm font-black text-foreground truncate font-mono">
                {formatCurrency(metrics.dailyLossRemaining)} left today
              </div>
              <div className="text-[11px] text-muted truncate">
                of {formatCurrency(metrics.maxDailyLossAmount)} max
                {metrics.todayLoss > 0 ? (
                  <>
                    {' · '}
                    <span className="text-rose-400 font-bold font-mono">
                      -{formatCurrency(metrics.todayLoss)} loss
                    </span>
                  </>
                ) : (
                  <>
                    {' · '}
                    <span className="text-emerald-400 font-bold font-mono">
                      0 loss today
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card 5: Sub-1-min Trades / Consistency Cap */}
          <div className="p-4 rounded-2xl bg-surface-card border border-border dark:border-white/[0.08] hover:border-white/[0.18] transition-all flex items-center gap-3.5 shadow-sm">
            {renderCircleProgress(
              (metrics.sub1MinTradesPercent / 10) * 100,
              `${metrics.sub1MinTradesPercent}%`,
              'of 10%',
              metrics.isSub1MinCompliant ? '#10b981' : '#f43f5e',
              metrics.isSub1MinCompliant ? 'text-emerald-400' : 'text-rose-400'
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-muted">Sub-1-min trades</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    metrics.isSub1MinCompliant
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {metrics.isSub1MinCompliant ? 'Compliant' : 'Over limit'}
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
    </div>
  );
};
