import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { filterTradesByPeriod, formatCurrency, sortTradesDescending, calculateSummaryStats } from '../lib/calculations';
import {
  calculateTradeScores,
  calculateTradingActivity
} from '../lib/scoreCalculations';
import { HeroMetricsBanner } from '../components/dashboard/HeroMetricsBanner';
import { TradeScoreCard } from '../components/dashboard/TradeScoreCard';
import { TradingActivityCard } from '../components/dashboard/TradingActivityCard';
import { AnalyticsOverviewGrid } from '../components/dashboard/AnalyticsOverviewGrid';
import { CoreMetricsRow } from '../components/dashboard/CoreMetricsRow';
import { TraderszoneAICard } from '../components/dashboard/TraderszoneAICard';
import { PropFirmObjectivesTracker } from '../components/dashboard/PropFirmObjectivesTracker';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import {
  DollarSign,
  Percent,
  TrendingUp,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Flame,
  Shield,
  Plus,
  Sparkles,
  CalendarX,
  Clock
} from 'lucide-react';

export const DashboardPage: React.FC<{ onOpenAddTrade: () => void }> = ({ onOpenAddTrade }) => {
  const { user } = useAuth();
  const { accountTrades, activeAccount, accounts, profile, stats, behavioralAlerts } = useTrading();
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  const filteredTrades = useMemo(() => {
    return filterTradesByPeriod(accountTrades, period);
  }, [accountTrades, period]);

  const initialBalance = activeAccount?.initialBalance || 10000;

  // Period-specific summary statistics
  const periodStats = useMemo(() => {
    return calculateSummaryStats(filteredTrades, initialBalance);
  }, [filteredTrades, initialBalance]);

  // Image 1 & 4 dynamic calculations based on period
  const scoreData = useMemo(
    () => calculateTradeScores(filteredTrades, periodStats),
    [filteredTrades, periodStats]
  );

  const [activityYear, setActivityYear] = useState<number>(new Date().getFullYear());

  const activityData = useMemo(
    () => calculateTradingActivity(accountTrades.length > 0 ? accountTrades : filteredTrades, activityYear),
    [accountTrades, filteredTrades, activityYear]
  );

  // AI Guidance Status
  let aiStatus = {
    mode: 'CONTROLLED AGGRESSION',
    badgeColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    description: 'Win rate is strong and drawdown is negligible. Market conditions favor your playbook. Continue taking Grade-A setups with standard position sizing.'
  };

  if (stats.winRate < 45 || stats.maxDrawdownPercent > 4.0) {
    aiStatus = {
      mode: 'STAND DOWN / DEFENSIVE',
      badgeColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
      description: 'Account is experiencing drawdown or low hit-rate. Cut position sizing by 50% (max 0.5% risk) until you log 2 consecutive winning setups.'
    };
  } else if (stats.winRate < 60) {
    aiStatus = {
      mode: 'NEUTRAL EXECUTION',
      badgeColor: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      description: 'Balanced performance. Be selective and wait for prime session liquidity sweeps before executing.'
    };
  }

  return (
    <ErrorBoundary fallbackTitle="Dashboard display error">
      <div className="space-y-6">
        {/* Top Header: Welcome, Period Filter, Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <span>Trading Dashboard</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                {activeAccount ? activeAccount.name : 'All Accounts'}
              </span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Real-time performance metrics, equity growth, and AI behavioral guidance.
            </p>
          </div>

          {/* Period Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-border rounded-xl shadow-sm">
            {(['today', 'week', 'month', 'year', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  period === p
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {p === 'all' ? 'All Time' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Prop Firm Image 3 Confluences / Objectives Tracker (Only when active account is Prop Firm) */}
        {activeAccount && activeAccount.type === 'Prop Firm' && (
          <PropFirmObjectivesTracker
            account={activeAccount}
            trades={accountTrades}
          />
        )}

        {filteredTrades.length === 0 ? (
          /* Dedicated Clean Empty-State When No Executed Trades in Selected Period */
          <div className="premium-card p-8 md:p-14 text-center max-w-2xl mx-auto my-6 space-y-6 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-sm">
              <CalendarX className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                {period === 'today' && 'No executed trades today'}
                {period === 'week' && 'No executed trades this week'}
                {period === 'month' && 'No executed trades this month'}
                {period === 'year' && 'No executed trades this year'}
                {period === 'all' && 'No executed trades recorded yet'}
              </h2>
              <p className="text-xs md:text-sm text-muted max-w-md mx-auto leading-relaxed">
                {period === 'today' && 'You have not executed or logged any trades today. Switch back to All Time to view your overall journal history or log a new trade execution.'}
                {period === 'week' && 'No trade executions were logged during the last 7 days. Switch back to All Time to see your trading analytics or log a trade.'}
                {period === 'month' && 'No trade executions found for the current month. Switch back to All Time to review your trading history.'}
                {period === 'year' && 'No trade executions recorded for the current year.'}
                {period === 'all' && 'No trade executions recorded for this account yet. Import a CSV or log your first trade to get started.'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={onOpenAddTrade}
              >
                Log Trade
              </Button>
              {period !== 'all' && (
                <Button
                  variant="secondary"
                  icon={<Clock className="w-4 h-4" />}
                  onClick={() => setPeriod('all')}
                >
                  View All Time
                </Button>
              )}
              <Link to="/trades">
                <Button variant="outline">
                  All Trades
                </Button>
              </Link>
            </div>

            {/* Reassurance footer if account has other trades */}
            {accountTrades.length > 0 && period !== 'all' && (
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
                <div>
                  <span className="font-semibold text-foreground font-mono">{accountTrades.length}</span> total trades in journal
                </div>
                <div className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <div>
                  All-Time Net P&L:{' '}
                  <span className={`font-bold font-mono ${stats.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats.netPnl >= 0 ? '+' : ''}{formatCurrency(stats.netPnl)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Hero Metrics Banner (Image 1 Design with Swapped Total P&L / Today's P&L and Vending Counter) */}
            <HeroMetricsBanner
              stats={periodStats}
              trades={filteredTrades}
              activeAccount={activeAccount}
              accounts={accounts}
              profile={profile}
              user={user}
              period={period}
              allTimeStats={stats}
            />

            {/* AI Behavioral Recommendation Banner */}
            <div className="premium-card p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Trader Zone AI Guidance
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${aiStatus.badgeColor}`}>
                      {aiStatus.mode}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed max-w-3xl font-medium">
                    {aiStatus.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link to="/ai-2">
                  <Button size="sm" variant="secondary" icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}>
                    Open AI 2.0
                  </Button>
                </Link>
              </div>
            </div>

            {/* 1. [IMAGE 1] Trade Score & Trading Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <TradeScoreCard scoreData={scoreData} />
              <TradingActivityCard activityData={activityData} onYearChange={setActivityYear} />
            </div>

            {/* 2. [IMAGE 2] Analytics Overview Grid */}
            <AnalyticsOverviewGrid trades={filteredTrades} initialBalance={initialBalance} />

            {/* 3. [IMAGE 3] Core Metrics Row */}
            <CoreMetricsRow stats={periodStats} trades={filteredTrades} />

            {/* 4. [IMAGE 4] Traderszone AI Card */}
            <TraderszoneAICard scoreData={scoreData} />

            {/* Behavioral Alerts Banner if any */}
            {behavioralAlerts.length > 0 && (
              <div className="premium-card p-4 border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-300">
                      {behavioralAlerts[0].title}
                    </div>
                    <div className="text-[11px] text-foreground">
                      {behavioralAlerts[0].description}
                    </div>
                  </div>
                </div>
                <Link to="/progress">
                  <Button size="sm" variant="outline">Review Rules</Button>
                </Link>
              </div>
            )}

            {/* Recent Trades Table */}
            <div className="premium-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">Recent Trade Executions</h3>
                  <p className="text-xs text-muted">
                    {period === 'all'
                      ? 'Latest activity across your active account.'
                      : `Showing trades for ${period === 'today' ? 'today' : period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'this year'}.`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/trades">
                    <Button size="sm" variant="outline">
                      View All Trades ({filteredTrades.length})
                    </Button>
                  </Link>
                  <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onOpenAddTrade}>
                    Log Trade
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase tracking-wider font-semibold">
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Side</th>
                      <th className="pb-3">Lots</th>
                      <th className="pb-3">Entry</th>
                      <th className="pb-3">Exit</th>
                      <th className="pb-3">Net P&L</th>
                      <th className="pb-3">R:R</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortTradesDescending(filteredTrades).slice(0, 5).map(t => {
                      const isWin = t.netPnl > 0;
                      const isLoss = t.netPnl < 0;

                      return (
                        <tr key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{t.symbol}</span>
                              {t.setupTags?.[0] && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted">
                                  {t.setupTags[0]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant={t.direction === 'BUY' ? 'buy' : 'sell'} size="sm">
                              {t.direction}
                            </Badge>
                          </td>
                          <td className="py-3 font-mono text-foreground">{t.lotSize}</td>
                          <td className="py-3 font-mono text-foreground">{t.entryPrice}</td>
                          <td className="py-3 font-mono text-foreground">{t.exitPrice || '-'}</td>
                          <td className="py-3 font-mono font-bold">
                            <span className={isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-muted'}>
                              {formatCurrency(t.netPnl)}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-foreground">
                            {t.realizedRR ? `1:${t.realizedRR}` : t.plannedRR ? `1:${t.plannedRR} (P)` : '-'}
                          </td>
                          <td className="py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === 'OPEN'
                                ? 'bg-sky-500/20 text-sky-500 border border-sky-500/30'
                                : 'bg-black/5 dark:bg-slate-800 text-muted'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              to={`/trades/${t.id}`}
                              className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                            >
                              <span>Review</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};
