import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EquityCurveChart } from '../components/charts/EquityCurveChart';
import { DailyPnlBarChart } from '../components/charts/DailyPnlBarChart';
import { filterTradesByPeriod, formatCurrency } from '../lib/calculations';
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
  Sparkles
} from 'lucide-react';

export const DashboardPage: React.FC<{ onOpenAddTrade: () => void }> = ({ onOpenAddTrade }) => {
  const { accountTrades, activeAccount, stats, behavioralAlerts } = useTrading();
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  const filteredTrades = filterTradesByPeriod(accountTrades, period);

  // Period-specific calculation
  const periodPnl = filteredTrades
    .filter(t => t.status === 'CLOSED')
    .reduce((sum, t) => sum + t.netPnl, 0);

  const closedPeriodTrades = filteredTrades.filter(t => t.status === 'CLOSED');
  const winCount = closedPeriodTrades.filter(t => t.netPnl > 0).length;
  const periodWinRate = closedPeriodTrades.length > 0 ? (winCount / closedPeriodTrades.length) * 100 : 0;

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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net P&L"
          value={formatCurrency(period === 'all' ? stats.netPnl : periodPnl)}
          subValue={
            activeAccount
              ? `${periodPnl >= 0 ? '+' : ''}${((periodPnl / activeAccount.initialBalance) * 100).toFixed(2)}% Return`
              : undefined
          }
          trend={periodPnl >= 0 ? 'positive' : 'negative'}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg={periodPnl >= 0 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border-rose-500/30'}
        />

        <StatCard
          label="Win Rate"
          value={`${(period === 'all' ? stats.winRate : periodWinRate).toFixed(1)}%`}
          subValue={`${stats.winningTrades}W - ${stats.losingTrades}L (${stats.breakEvenTrades} BE)`}
          trend={stats.winRate >= 50 ? 'positive' : 'negative'}
          icon={<Percent className="w-5 h-5" />}
          iconBg="bg-primary/15 text-primary border border-primary/30"
        />

        <StatCard
          label="Profit Factor"
          value={stats.profitFactor.toFixed(2)}
          subValue={`Avg Win: $${stats.avgWin.toFixed(0)} | Avg Loss: $${stats.avgLoss.toFixed(0)}`}
          trend={stats.profitFactor >= 1.5 ? 'positive' : 'neutral'}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-violet-500/15 text-violet-500 border border-violet-500/30"
        />

        <StatCard
          label="Max Drawdown"
          value={`${stats.maxDrawdownPercent.toFixed(1)}%`}
          subValue={`-$${stats.maxDrawdownUsd.toFixed(0)} peak-to-valley`}
          trend={stats.maxDrawdownPercent < 5 ? 'positive' : 'negative'}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBg="bg-amber-500/15 text-amber-500 border border-amber-500/30"
        />
      </div>

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

      {/* Main Visuals: Equity Curve (2/3) & Daily Bar Chart / Streak (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 premium-card p-5">
          <EquityCurveChart
            trades={filteredTrades}
            initialBalance={activeAccount ? activeAccount.initialBalance : 100000}
          />
        </div>

        <div className="premium-card p-5 flex flex-col justify-between space-y-4">
          <DailyPnlBarChart trades={filteredTrades} />

          {/* Quick Streak & Risk Summary */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Current Streak:</span>
              </span>
              <span className="font-mono text-sm font-black text-foreground">
                {stats.currentStreak.type === 'win' && (
                  <span className="text-emerald-500">+{stats.currentStreak.count} Wins</span>
                )}
                {stats.currentStreak.type === 'loss' && (
                  <span className="text-rose-500">-{stats.currentStreak.count} Losses</span>
                )}
                {stats.currentStreak.type === 'none' && 'Neutral'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Expectancy / Trade:</span>
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                ${stats.expectancy.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary" />
                <span>Total Volume Traded:</span>
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                {stats.totalLots} Lots
              </span>
            </div>
          </div>
        </div>
      </div>

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
            <p className="text-xs text-muted">Latest activity across your active account.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/trades">
              <Button size="sm" variant="outline">
                View All Trades ({accountTrades.length})
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
                <th className="pb-3">Pips</th>
                <th className="pb-3">Net P&L</th>
                <th className="pb-3">R:R</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accountTrades.slice(0, 5).map(t => {
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
                    <td className="py-3 font-mono text-foreground">{t.pips ? `${t.pips > 0 ? '+' : ''}${t.pips}` : '-'}</td>
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
    </div>
  );
};
