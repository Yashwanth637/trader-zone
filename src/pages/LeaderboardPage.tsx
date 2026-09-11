import React, { useState } from 'react';
import { Trophy, Award, TrendingUp, Users, Shield } from 'lucide-react';
import { formatCurrency } from '../lib/calculations';

interface LeaderboardEntry {
  rank: number;
  name: string;
  badge: 'Master' | 'Pro' | 'Elite' | 'Rising Star';
  pnlMonth: number;
  winRate: number;
  profitFactor: number;
  totalLots: number;
  isUser?: boolean;
}

export const LeaderboardPage: React.FC = () => {
  const [filter, setFilter] = useState<'month' | 'all' | 'weekly'>('month');

  const traders: LeaderboardEntry[] = [
    { rank: 1, name: 'SMC_Sniper_99', badge: 'Master', pnlMonth: 14250.00, winRate: 78.4, profitFactor: 3.42, totalLots: 42.5 },
    { rank: 2, name: 'AlgoFlow_Capital', badge: 'Master', pnlMonth: 11840.00, winRate: 71.0, profitFactor: 2.98, totalLots: 56.0 },
    { rank: 3, name: 'GoldHunter_FX', badge: 'Pro', pnlMonth: 8950.00, winRate: 68.2, profitFactor: 2.75, totalLots: 31.0 },
    { rank: 4, name: 'Yashwant (You)', badge: 'Elite', pnlMonth: 4850.00, winRate: 71.4, profitFactor: 2.95, totalLots: 17.5, isUser: true },
    { rank: 5, name: 'Liquidity_King', badge: 'Elite', pnlMonth: 4210.00, winRate: 64.0, profitFactor: 2.10, totalLots: 24.0 },
    { rank: 6, name: 'Delta_Scalper', badge: 'Rising Star', pnlMonth: 3100.00, winRate: 59.5, profitFactor: 1.85, totalLots: 38.0 },
    { rank: 7, name: 'MacroWave_Trader', badge: 'Rising Star', pnlMonth: 2400.00, winRate: 55.0, profitFactor: 1.62, totalLots: 19.0 }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span>Trader Community Leaderboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monthly verified performance rankings across the global Trader Zone community.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-border rounded-xl">
          {(['weekly', 'month', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === f ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Time' : f === 'month' ? 'This Month' : 'This Week'}
            </button>
          ))}
        </div>
      </div>

      {/* User Standing Banner */}
      <div className="premium-card p-6 border-primary/40 shadow-glow-primary flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-xl text-primary-light font-mono">
            #4
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Your Global Rank</span>
            <div className="text-lg font-bold text-white">Yashwant · Elite Trader Tier</div>
            <div className="text-xs text-emerald-400 mt-0.5">Top 5% among verified traders</div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Monthly P&L</div>
            <div className="text-xl font-black text-emerald-400 font-mono">+$4,850.00</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
            <div className="text-xl font-black text-white font-mono">71.4%</div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="premium-card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 w-16">Rank</th>
                <th className="pb-3">Trader Name</th>
                <th className="pb-3">Tier</th>
                <th className="pb-3">Win Rate</th>
                <th className="pb-3">Profit Factor</th>
                <th className="pb-3">Volume</th>
                <th className="pb-3 text-right">Monthly Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {traders.map(t => (
                <tr
                  key={t.rank}
                  className={`transition-colors ${t.isUser ? 'bg-primary/10 font-bold' : 'hover:bg-white/5'}`}
                >
                  <td className="py-3.5 font-black font-mono">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                      t.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                      t.rank === 2 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/40' :
                      t.rank === 3 ? 'bg-amber-600/20 text-amber-500 border border-amber-600/40' :
                      'text-slate-400'
                    }`}>
                      #{t.rank}
                    </span>
                  </td>

                  <td className="py-3.5 font-bold text-white flex items-center gap-2">
                    <span>{t.name}</span>
                    {t.isUser && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary text-white font-black">
                        YOU
                      </span>
                    )}
                  </td>

                  <td className="py-3.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-slate-300 font-mono">
                      {t.badge}
                    </span>
                  </td>

                  <td className="py-3.5 font-mono text-white">{t.winRate}%</td>
                  <td className="py-3.5 font-mono text-primary-light">{t.profitFactor}</td>
                  <td className="py-3.5 font-mono text-slate-400">{t.totalLots} Lots</td>

                  <td className="py-3.5 font-mono font-black text-right text-emerald-400">
                    +{formatCurrency(t.pnlMonth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
