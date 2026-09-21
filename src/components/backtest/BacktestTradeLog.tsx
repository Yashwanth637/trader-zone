import React from 'react';
import { BacktestTrade, BacktestStats, BacktestPosition } from '../../types/backtest';
import { formatCurrency } from '../../lib/calculations';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Hand,
  Trash2,
  Download,
  BarChart2,
  XCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface BacktestTradeLogProps {
  trades: BacktestTrade[];
  stats: BacktestStats;
  openPosition?: BacktestPosition | null;
  onClosePosition?: () => void;
  onMoveToBreakeven?: () => void;
  onClearTrades: () => void;
  onDeleteTrade?: (tradeId: string) => void;
}

export const BacktestTradeLog: React.FC<BacktestTradeLogProps> = ({
  trades,
  stats,
  openPosition,
  onClosePosition,
  onMoveToBreakeven,
  onClearTrades,
  onDeleteTrade
}) => {
  const exportTradesCSV = () => {
    if (trades.length === 0) return;
    const header = ['ID', 'Side', 'Symbol', 'Timeframe', 'Entry Price', 'Exit Price', 'Net PnL', 'R Multiple', 'Exit Reason'];
    const rows = trades.map(t => [
      t.id,
      t.side,
      t.symbol,
      t.timeframe,
      t.entryPrice,
      t.exitPrice,
      t.netPnl,
      t.rMultiple,
      t.exitReason
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `backtest_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-surface-card border border-border/40 dark:border-white/[0.08] rounded-2xl p-4 shadow-xl space-y-4">
      {/* Session Analytics Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pb-3 border-b border-border/40 dark:border-white/[0.06]">
        <div className="bg-surface/80 p-2.5 rounded-xl border border-border/40 dark:border-white/[0.06]">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Total Trades</div>
          <div
            className="text-lg font-black text-foreground"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {stats.totalTrades}
          </div>
          <div
            className="text-[10px] text-muted"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {stats.winCount}W / {stats.lossCount}L
          </div>
        </div>

        <div className="bg-surface/80 p-2.5 rounded-xl border border-border/40 dark:border-white/[0.06]">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Win Rate</div>
          <div
            className={`text-lg font-black ${
              stats.winRate >= 50 ? 'text-emerald-400' : 'text-foreground'
            }`}
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {stats.winRate}%
          </div>
          <div
            className="text-[10px] text-muted"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {stats.breakevenCount} BE
          </div>
        </div>

        <div className="bg-surface/80 p-2.5 rounded-xl border border-border/40 dark:border-white/[0.06]">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Net Return</div>
          <div
            className={`text-lg font-black ${
              stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {stats.netPnl >= 0 ? '+' : ''}
            {formatCurrency(stats.netPnl)}
          </div>
          <div className="text-[10px] text-muted">Realized P&L</div>
        </div>

        <div className="bg-surface/80 p-2.5 rounded-xl border border-border/40 dark:border-white/[0.06]">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Profit Factor</div>
          <div
            className="text-lg font-black text-foreground"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {stats.profitFactor.toFixed(2)}
          </div>
          <div
            className="text-[10px] text-muted"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            Avg R: {stats.avgRR.toFixed(1)}R
          </div>
        </div>

        <div className="bg-surface/80 p-2.5 rounded-xl border border-border/40 dark:border-white/[0.06]">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Avg Win / Loss</div>
          <div
            className="text-xs font-bold text-emerald-400"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            +{formatCurrency(stats.avgWin)}
          </div>
          <div
            className="text-xs font-bold text-rose-400"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            -{formatCurrency(stats.avgLoss)}
          </div>
        </div>

        <div className="bg-surface/80 p-2.5 rounded-xl border border-border/40 dark:border-white/[0.06]">
          <div className="text-[10px] text-muted uppercase font-bold tracking-wider">Max Drawdown</div>
          <div
            className="text-lg font-black text-rose-400"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {stats.maxDrawdown}%
          </div>
          <div className="text-[10px] text-muted">Peak-to-Trough</div>
        </div>
      </div>

      {/* Active Open Position Action Banner (Item 3: Option to close current trade) */}
      {openPosition && onClosePosition && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary animate-pulse" />
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  openPosition.side === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                OPEN {openPosition.side}
              </span>
              <span className="text-xs text-foreground font-semibold">
                Entry: {openPosition.entryPrice}
              </span>
              <span
                className={`text-xs font-bold ${
                  openPosition.currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                ({openPosition.currentPnl >= 0 ? '+' : ''}{formatCurrency(openPosition.currentPnl)} / {openPosition.currentR}R)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onMoveToBreakeven && (
              <button
                type="button"
                onClick={onMoveToBreakeven}
                disabled={openPosition.isBreakEven}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-elevated border border-border/40 text-muted hover:text-foreground disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>{openPosition.isBreakEven ? 'At BE' : 'Breakeven'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClosePosition}
              className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Close Trade Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground tracking-tight">
            Session Trade Log ({trades.length})
          </h3>
          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
            Isolated Sandbox
          </span>
        </div>

        <div className="flex items-center gap-2">
          {trades.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportTradesCSV}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-elevated border border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all backtest trades in this session?')) {
                    onClearTrades();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trades Table */}
      {trades.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted">
          No simulated trades executed yet. Place a Market or Limit order and step forward bars to backtest.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table
            className="w-full text-left text-xs"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            <thead className="bg-surface/90 text-muted uppercase text-[10px] sticky top-0 border-b border-border/40 dark:border-white/[0.06]">
              <tr>
                <th className="py-2 px-3">Side</th>
                <th className="py-2 px-3">Entry</th>
                <th className="py-2 px-3">Exit</th>
                <th className="py-2 px-3">Units</th>
                <th className="py-2 px-3">Exit Type</th>
                <th className="py-2 px-3 text-right">R-Multiple</th>
                <th className="py-2 px-3 text-right">Net P&L</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 dark:divide-white/[0.06]">
              {trades.map((trade, idx) => {
                const isWin = trade.netPnl > 0.01;
                const isLoss = trade.netPnl < -0.01;

                return (
                  <tr key={trade.id || idx} className="hover:bg-surface-elevated/40 transition-colors group">
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          trade.side === 'BUY'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {trade.side === 'BUY' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground">{trade.entryPrice}</td>
                    <td className="py-2.5 px-3 text-foreground">{trade.exitPrice}</td>
                    <td className="py-2.5 px-3 text-muted">{trade.quantity}</td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1 text-[11px] text-foreground">
                        {trade.exitReason === 'TP' && (
                          <>
                            <Target className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Take Profit</span>
                          </>
                        )}
                        {trade.exitReason === 'SL' && (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            <span>Stop Loss</span>
                          </>
                        )}
                        {trade.exitReason === 'MANUAL' && (
                          <>
                            <Hand className="w-3.5 h-3.5 text-sky-400" />
                            <span>Manual Close</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        trade.rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {trade.rMultiple >= 0 ? '+' : ''}
                      {trade.rMultiple}R
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-muted'
                      }`}
                    >
                      {trade.netPnl >= 0 ? '+' : ''}
                      {formatCurrency(trade.netPnl)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {onDeleteTrade && (
                        <button
                          type="button"
                          onClick={() => onDeleteTrade(trade.id)}
                          title="Delete this trade"
                          className="p-1 rounded text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
