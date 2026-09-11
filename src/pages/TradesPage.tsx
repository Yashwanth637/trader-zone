import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/calculations';
import {
  History,
  Search,
  Plus,
  Upload,
  ArrowUpRight,
  Trash2,
  PlayCircle
} from 'lucide-react';

interface TradesPageProps {
  onOpenAddTrade: () => void;
  onOpenCsvImport: () => void;
}

export const TradesPage: React.FC<TradesPageProps> = ({ onOpenAddTrade, onOpenCsvImport }) => {
  const { accountTrades, deleteTrade, closeTrade, strategies } = useTrading();

  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [strategyFilter, setStrategyFilter] = useState('ALL');

  // Close Trade Modal state
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeExitPrice, setCloseExitPrice] = useState('');

  const filteredTrades = accountTrades.filter(t => {
    if (search) {
      const q = search.toLowerCase();
      const matchSym = t.symbol.toLowerCase().includes(q);
      const matchTicket = t.ticket.toLowerCase().includes(q);
      const matchNotes = t.notes?.toLowerCase().includes(q);
      if (!matchSym && !matchTicket && !matchNotes) return false;
    }
    if (directionFilter !== 'ALL' && t.direction !== directionFilter) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (outcomeFilter === 'WIN' && t.netPnl <= 0) return false;
    if (outcomeFilter === 'LOSS' && t.netPnl >= 0) return false;
    if (strategyFilter !== 'ALL' && t.strategyId !== strategyFilter) return false;
    return true;
  });

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingTradeId || !closeExitPrice) return;
    closeTrade(closingTradeId, parseFloat(closeExitPrice));
    setClosingTradeId(null);
    setCloseExitPrice('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-primary" />
            <span>Trade History</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Log, filter, manage, and analyze your entire trading log.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={onOpenCsvImport}>
            Import CSV / Broker
          </Button>
          <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onOpenAddTrade}>
            Log Trade
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="premium-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol, ticket, or notes..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
            />
          </div>

          {/* Direction */}
          <div>
            <select
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
            >
              <option value="ALL">Direction: All</option>
              <option value="BUY">BUY Only</option>
              <option value="SELL">SELL Only</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value="OPEN">Running (OPEN)</option>
              <option value="CLOSED">Closed Trades</option>
            </select>
          </div>

          {/* Outcome */}
          <div>
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
            >
              <option value="ALL">Outcome: All</option>
              <option value="WIN">Winners Only</option>
              <option value="LOSS">Losers Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Showing {filteredTrades.length} of {accountTrades.length} Trades
          </span>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted border border-dashed border-border rounded-xl">
            No trades match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted uppercase tracking-wider font-semibold">
                  <th className="pb-3">Symbol & Setup</th>
                  <th className="pb-3">Side</th>
                  <th className="pb-3">Lots</th>
                  <th className="pb-3">Open Date</th>
                  <th className="pb-3">Entry</th>
                  <th className="pb-3">Exit</th>
                  <th className="pb-3">Pips</th>
                  <th className="pb-3">Net P&L</th>
                  <th className="pb-3">R:R</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTrades.map(t => {
                  const isWin = t.netPnl > 0.01;
                  const isLoss = t.netPnl < -0.01;

                  return (
                    <tr key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <Link to={`/trades/${t.id}`} className="hover:text-primary transition-colors">
                            {t.symbol}
                          </Link>
                          {t.strategyName && (
                            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-surface border border-border text-muted">
                              {t.strategyName}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted font-mono">#{t.ticket}</div>
                      </td>

                      <td className="py-3">
                        <Badge variant={t.direction === 'BUY' ? 'buy' : 'sell'} size="sm">
                          {t.direction}
                        </Badge>
                      </td>

                      <td className="py-3 font-mono text-foreground">{t.lotSize}</td>

                      <td className="py-3 text-muted font-mono">
                        {new Date(t.openTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 font-mono text-foreground">{t.entryPrice}</td>
                      <td className="py-3 font-mono text-foreground">{t.exitPrice || '-'}</td>
                      <td className="py-3 font-mono text-muted">
                        {t.pips ? `${t.pips > 0 ? '+' : ''}${t.pips}` : '-'}
                      </td>

                      <td className="py-3 font-mono font-bold">
                        <span className={isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-muted'}>
                          {formatCurrency(t.netPnl)}
                        </span>
                      </td>

                      <td className="py-3 font-mono text-muted">
                        {t.realizedRR ? `1:${t.realizedRR}` : t.plannedRR ? `1:${t.plannedRR} (P)` : '-'}
                      </td>

                      <td className="py-3">
                        {t.status === 'OPEN' ? (
                          <button
                            onClick={() => {
                              setClosingTradeId(t.id);
                              setCloseExitPrice(t.entryPrice.toString());
                            }}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-500 border border-sky-500/40 hover:bg-sky-500/30 transition-colors"
                          >
                            Close Trade
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted font-medium">CLOSED</span>
                        )}
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === 'CLOSED' && (
                            <Link
                              to={`/replay?tradeId=${t.id}`}
                              className="px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all text-[11px] font-bold inline-flex items-center gap-1"
                              title="Replay this trade"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Replay</span>
                            </Link>
                          )}
                          <Link
                            to={`/trades/${t.id}`}
                            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                            title="View Details"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm(`Delete trade #${t.ticket} (${t.symbol})?`)) {
                                deleteTrade(t.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10"
                            title="Delete Trade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Close Trade Modal */}
      {closingTradeId && (
        <Modal isOpen={!!closingTradeId} onClose={() => setClosingTradeId(null)} title="Close Open Trade" maxWidth="sm">
          <form onSubmit={handleCloseSubmit} className="space-y-4">
            <p className="text-xs text-muted">
              Enter the exact exit price to calculate your realized profit/loss and update your account balance.
            </p>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Exit Price</label>
              <input
                type="number"
                step="0.00001"
                required
                value={closeExitPrice}
                onChange={e => setCloseExitPrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setClosingTradeId(null)}>Cancel</Button>
              <Button type="submit" variant="primary">Confirm Close</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
