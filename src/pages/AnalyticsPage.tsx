import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { EquityCurveChart } from '../components/charts/EquityCurveChart';
import { DrawdownChart } from '../components/charts/DrawdownChart';
import { HeatmapChart } from '../components/charts/HeatmapChart';
import { formatCurrency } from '../lib/calculations';
import {
  TrendingUp,
  Clock,
  Layers,
  Award,
  BarChart2,
  PieChart,
  Calendar,
  Percent
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { accountTrades, activeAccount, stats } = useTrading();
  const [tab, setTab] = useState<'overview' | 'sessions' | 'symbols' | 'direction'>('overview');

  const closed = accountTrades.filter(t => t.status === 'CLOSED');

  // Breakdown by Session
  const sessionStats: Record<string, { pnl: number; count: number; wins: number }> = {
    London: { pnl: 0, count: 0, wins: 0 },
    'New York': { pnl: 0, count: 0, wins: 0 },
    Overlap: { pnl: 0, count: 0, wins: 0 },
    Asian: { pnl: 0, count: 0, wins: 0 },
    'Off-Hours': { pnl: 0, count: 0, wins: 0 }
  };

  // Breakdown by Symbol
  const symbolStats: Record<string, { pnl: number; count: number; wins: number; lots: number }> = {};

  // Breakdown by Direction
  let buyPnl = 0;
  let buyCount = 0;
  let buyWins = 0;
  let sellPnl = 0;
  let sellCount = 0;
  let sellWins = 0;

  closed.forEach(t => {
    // Session
    const sess = t.session || 'London';
    if (sessionStats[sess]) {
      sessionStats[sess].pnl += t.netPnl;
      sessionStats[sess].count += 1;
      if (t.netPnl > 0) sessionStats[sess].wins += 1;
    }

    // Symbol
    if (!symbolStats[t.symbol]) {
      symbolStats[t.symbol] = { pnl: 0, count: 0, wins: 0, lots: 0 };
    }
    symbolStats[t.symbol].pnl += t.netPnl;
    symbolStats[t.symbol].count += 1;
    symbolStats[t.symbol].lots += t.lotSize;
    if (t.netPnl > 0) symbolStats[t.symbol].wins += 1;

    // Direction
    if (t.direction === 'BUY') {
      buyPnl += t.netPnl;
      buyCount += 1;
      if (t.netPnl > 0) buyWins += 1;
    } else {
      sellPnl += t.netPnl;
      sellCount += 1;
      if (t.netPnl > 0) sellWins += 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-primary-light" />
          <span>Performance Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Comprehensive institutional performance metrics, session heatmaps, and edge analysis.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Equity', icon: BarChart2 },
          { id: 'sessions', label: 'Sessions & Heatmaps', icon: Clock },
          { id: 'symbols', label: 'Assets & Instruments', icon: Layers },
          { id: 'direction', label: 'Long vs Short', icon: PieChart }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === item.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Top Equity Curve */}
          <div className="premium-card p-5">
            <EquityCurveChart
              trades={accountTrades}
              initialBalance={activeAccount ? activeAccount.initialBalance : 100000}
            />
          </div>

          {/* Underwater Drawdown */}
          <div className="premium-card p-5">
            <DrawdownChart
              trades={accountTrades}
              initialBalance={activeAccount ? activeAccount.initialBalance : 100000}
            />
          </div>

          {/* Statistical Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="premium-card p-4">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Largest Winner</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                +${stats.largestWin.toFixed(2)}
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Largest Loser</div>
              <div className="text-lg font-black text-rose-400 font-mono mt-1">
                -${stats.largestLoss.toFixed(2)}
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Win / Loss Ratio</div>
              <div className="text-lg font-black text-white font-mono mt-1">
                {stats.winLossRatio.toFixed(2)}
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Total Commissions</div>
              <div className="text-lg font-black text-slate-300 font-mono mt-1">
                ${stats.totalCommission.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-6">
          {/* Day of Week Heatmap */}
          <div className="premium-card p-5">
            <HeatmapChart trades={accountTrades} />
          </div>

          {/* Session Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(sessionStats).map(([name, s]) => {
              const isPos = s.pnl >= 0;
              const winRate = s.count > 0 ? Math.round((s.wins / s.count) * 100) : 0;
              return (
                <div key={name} className="premium-card p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase">{name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{s.count} trades</span>
                  </div>
                  <div className={`text-xl font-black font-mono ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(s.pnl)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Win Rate: <strong className="text-white">{winRate}%</strong> ({s.wins}W / {s.count - s.wins}L)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'symbols' && (
        <div className="premium-card p-5">
          <h3 className="text-base font-bold text-white mb-4">Instrument Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Symbol</th>
                  <th className="pb-3">Trades</th>
                  <th className="pb-3">Volume (Lots)</th>
                  <th className="pb-3">Win Rate</th>
                  <th className="pb-3">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {Object.entries(symbolStats).map(([sym, s]) => {
                  const isPos = s.pnl >= 0;
                  const winRate = s.count > 0 ? Math.round((s.wins / s.count) * 100) : 0;
                  return (
                    <tr key={sym} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 font-bold text-white">{sym}</td>
                      <td className="py-3 font-mono text-slate-300">{s.count}</td>
                      <td className="py-3 font-mono text-slate-300">{s.lots.toFixed(1)}</td>
                      <td className="py-3 font-mono text-white font-bold">{winRate}%</td>
                      <td className={`py-3 font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(s.pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'direction' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Longs */}
          <div className="premium-card p-6 border-emerald-500/20 bg-emerald-500/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-emerald-400 uppercase tracking-tight">BUY / LONG Trades</h3>
              <span className="text-xs font-mono text-slate-400">{buyCount} Trades</span>
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {formatCurrency(buyPnl)}
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>Win Rate: <strong>{buyCount > 0 ? Math.round((buyWins / buyCount) * 100) : 0}%</strong></div>
              <div>Record: {buyWins} Wins / {buyCount - buyWins} Losses</div>
            </div>
          </div>

          {/* Shorts */}
          <div className="premium-card p-6 border-rose-500/20 bg-rose-500/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-rose-400 uppercase tracking-tight">SELL / SHORT Trades</h3>
              <span className="text-xs font-mono text-slate-400">{sellCount} Trades</span>
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {formatCurrency(sellPnl)}
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>Win Rate: <strong>{sellCount > 0 ? Math.round((sellWins / sellCount) * 100) : 0}%</strong></div>
              <div>Record: {sellWins} Wins / {sellCount - sellWins} Losses</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
