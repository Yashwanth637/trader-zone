import React, { useState, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { filterTradesByPeriod, formatCurrency, calculateSummaryStats } from '../lib/calculations';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Shield,
  TrendingUp
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { accountTrades, activeAccount, profile } = useTrading();
  const [period, setPeriod] = useState<string>('all');
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = filterTradesByPeriod(accountTrades, period);
  const repStats = calculateSummaryStats(filtered, activeAccount ? activeAccount.initialBalance : 100000);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-primary-light" />
            <span>Executive Performance Report</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate and export institutional statement reports for audits and personal review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-card border border-border text-xs text-white focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          <Button size="sm" variant="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Printable Statement Document */}
      <div ref={printRef} className="premium-card p-8 space-y-8 bg-surface border-border">
        {/* Document Header */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <div className="text-2xl font-black tracking-tight text-white">
              <span>Trader</span>
              <span className="text-primary-light ml-0.5">Zone</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Audited Performance Statement</div>
          </div>

          <div className="text-right text-xs text-slate-400 space-y-0.5">
            <div>Trader: <strong className="text-white">{profile.name}</strong></div>
            <div>Account: <strong className="text-white">{activeAccount ? activeAccount.name : 'All Accounts'}</strong></div>
            <div>Generated: <strong className="text-white">{new Date().toLocaleDateString()}</strong></div>
          </div>
        </div>

        {/* Executive Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-card border border-border">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Net P&L</div>
            <div className={`text-xl font-black font-mono mt-1 ${repStats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(repStats.netPnl)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-border">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Win Rate</div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {repStats.winRate}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-border">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Profit Factor</div>
            <div className="text-xl font-black text-primary-light font-mono mt-1">
              {repStats.profitFactor.toFixed(2)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-border">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Max Drawdown</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-1">
              {repStats.maxDrawdownPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Financial Statistics Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-slate-400">Total Closed Trades:</span>
              <span className="font-mono text-white font-bold">{repStats.totalTrades}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-slate-400">Gross Profit:</span>
              <span className="font-mono text-emerald-400 font-bold">+${repStats.grossProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-slate-400">Winning / Losing Trades:</span>
              <span className="font-mono text-white">{repStats.winningTrades}W / {repStats.losingTrades}L</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-slate-400">Gross Loss:</span>
              <span className="font-mono text-rose-400 font-bold">-${repStats.grossLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-slate-400">Average Winner:</span>
              <span className="font-mono text-emerald-400 font-bold">+${repStats.avgWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-slate-400">Average Loser:</span>
              <span className="font-mono text-rose-400 font-bold">-${repStats.avgLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-slate-400">Total Volume Traded:</span>
              <span className="font-mono text-white">{repStats.totalLots} Lots</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-slate-400">Commissions & Swaps:</span>
              <span className="font-mono text-slate-300">${repStats.totalCommission.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Statement Footer */}
        <div className="border-t border-border pt-4 text-center text-[10px] text-slate-500">
          Trader Zone Automated Report · Confidential & Personal Use Only
        </div>
      </div>
    </div>
  );
};
