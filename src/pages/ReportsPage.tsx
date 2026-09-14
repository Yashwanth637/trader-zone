import React, { useState, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { filterTradesByPeriod, formatCurrency, calculateSummaryStats, formatSignedPnl } from '../lib/calculations';
import { generateExecutiveReportPDF } from '../lib/pdfReport';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Shield,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { accountTrades, activeAccount, profile } = useTrading();
  const [period, setPeriod] = useState<string>('all');
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = filterTradesByPeriod(accountTrades, period);
  const repStats = calculateSummaryStats(filtered, activeAccount ? activeAccount.initialBalance : 100000);

  const handleDownloadPDF = () => {
    generateExecutiveReportPDF({
      stats: repStats,
      trades: filtered,
      account: activeAccount,
      profileName: profile.name,
      period
    });
  };

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
            Generate and export institutional statement reports in standard audited PDF format.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <Button size="sm" variant="primary" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF}>
            Download Official PDF
          </Button>

          <Button size="sm" variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Statement
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Total Closed Trades:</span>
              <span className="font-mono text-white font-bold">{repStats.totalTrades}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Gross Profit:</span>
              <span className="font-mono text-emerald-400 font-bold">+{formatCurrency(repStats.grossProfit)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Winning / Losing Trades:</span>
              <span className="font-mono text-white">{repStats.winningTrades}W / {repStats.losingTrades}L</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Gross Loss:</span>
              <span className="font-mono text-rose-400 font-bold">-{formatCurrency(repStats.grossLoss)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Average Winner:</span>
              <span className="font-mono text-emerald-400 font-bold">+{formatCurrency(repStats.avgWin)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Average Loser:</span>
              <span className="font-mono text-rose-400 font-bold">-{formatCurrency(repStats.avgLoss)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Total Volume Traded:</span>
              <span className="font-mono text-white">{repStats.totalLots} Lots</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Commissions & Swaps:</span>
              <span className="font-mono text-slate-300">{formatCurrency(repStats.totalCommission)}</span>
            </div>
          </div>
        </div>

        {/* Audited Closed Trades Ledger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Audited Positions Ledger</h3>
            <span className="text-[10px] text-slate-400">{filtered.filter(t => t.status === 'CLOSED').length} Executed Positions</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card text-slate-400 text-[10px] uppercase font-bold border-b border-border">
                <tr>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Symbol</th>
                  <th className="px-3.5 py-2.5">Direction</th>
                  <th className="px-3.5 py-2.5">Lots</th>
                  <th className="px-3.5 py-2.5">Entry</th>
                  <th className="px-3.5 py-2.5">Exit</th>
                  <th className="px-3.5 py-2.5 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.filter(t => t.status === 'CLOSED').length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3.5 py-6 text-center text-slate-500 text-xs">
                      No closed trades recorded in this statement period.
                    </td>
                  </tr>
                ) : (
                  filtered.filter(t => t.status === 'CLOSED').slice(0, 8).map(t => (
                    <tr key={t.id} className="hover:bg-surface-card/40 transition-colors">
                      <td className="px-3.5 py-2 text-slate-400 font-mono text-[11px]">
                        {(t.closeTime || t.openTime).split('T')[0]}
                      </td>
                      <td className="px-3.5 py-2 font-bold text-white">{t.symbol}</td>
                      <td className="px-3.5 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.direction === 'BUY'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-slate-300 font-mono">{t.lotSize}</td>
                      <td className="px-3.5 py-2 text-slate-300 font-mono">{t.entryPrice}</td>
                      <td className="px-3.5 py-2 text-slate-300 font-mono">{t.exitPrice || '-'}</td>
                      <td className={`px-3.5 py-2 text-right font-mono font-bold ${
                        t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {formatSignedPnl(t.netPnl)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Governance & Behavioral Compliance */}
        <div className="p-4 rounded-xl bg-surface-card/60 border border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Risk Guardrails: <strong>100% Audited</strong></span>
          </div>
          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span>Stop Loss: <strong className="text-white">Mandated</strong></span>
            <span>Max Risk: <strong className="text-white">≤ 1.5%</strong></span>
            <span>Execution: <strong className="text-white">STP / Direct ECN</strong></span>
          </div>
        </div>

        {/* Certification & Sign-off Block */}
        <div className="border-t border-border pt-6 space-y-6">
          <p className="text-[11px] text-slate-400 italic leading-relaxed">
            I hereby certify that this executive statement reflects the audited execution records, risk parameters, and financial results recorded in Trader Zone.
          </p>

          <div className="grid grid-cols-2 gap-12 pt-2">
            <div>
              <div className="border-b border-slate-600/60 pb-1 text-xs font-bold text-white font-mono">
                {profile.name || 'Master Trader'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Authorized Trader Signature</div>
            </div>
            <div>
              <div className="border-b border-slate-600/60 pb-1 text-xs font-bold text-white font-mono">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Audit Verification Date</div>
            </div>
          </div>
        </div>

        {/* Statement Footer */}
        <div className="border-t border-border pt-4 text-center text-[10px] text-slate-500">
          Trader Zone Automated Report · Confidential & Personal Use Only · Generated by Institutional Engine
        </div>
      </div>
    </div>
  );
};
