import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, sortTradesDescending } from '../lib/calculations';
import {
  History,
  Search,
  Plus,
  Upload,
  ArrowUpRight,
  Trash2,
  PlayCircle,
  Zap,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { DeltaSyncModal } from '../components/broker/DeltaSyncModal';

interface TradesPageProps {
  onOpenAddTrade: () => void;
  onOpenCsvImport: () => void;
}

export const TradesPage: React.FC<TradesPageProps> = ({ onOpenAddTrade, onOpenCsvImport }) => {
  const { accountTrades, deleteTrade, closeTrade, strategies } = useTrading();
  const [deltaModalOpen, setDeltaModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [strategyFilter, setStrategyFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Close Trade Modal state
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeExitPrice, setCloseExitPrice] = useState('');

  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    accountTrades.forEach(t => {
      const y = new Date(t.openTime).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [accountTrades]);

  const filteredTrades = React.useMemo(() => {
    const list = accountTrades.filter(t => {
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

      const tradeDate = new Date(t.openTime);
      if (yearFilter !== 'ALL') {
        if (tradeDate.getFullYear().toString() !== yearFilter) return false;
      }
      if (dateFilter) {
        const yyyy = tradeDate.getFullYear();
        const mm = String(tradeDate.getMonth() + 1).padStart(2, '0');
        const dd = String(tradeDate.getDate()).padStart(2, '0');
        const formattedTradeDate = `${yyyy}-${mm}-${dd}`;
        if (formattedTradeDate !== dateFilter) return false;
      }
      return true;
    });
    return sortTradesDescending(list);
  }, [accountTrades, search, directionFilter, statusFilter, outcomeFilter, strategyFilter, yearFilter, dateFilter]);

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
          <Button size="sm" variant="outline" icon={<Zap className="w-4 h-4 text-amber-400" />} onClick={() => setDeltaModalOpen(true)}>
            Sync Delta
          </Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol, ticket, notes..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none placeholder:text-muted/60"
            />
          </div>

          {/* View by Exact Date */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              title="Filter trades by exact date"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none font-mono"
            />
          </div>

          {/* Year Filter */}
          <div>
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none font-medium"
            >
              <option value="ALL">Year: All</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr.toString()}>{yr}</option>
              ))}
            </select>
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

          {/* Status & Outcome */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value="OPEN">Running</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value as any)}
              className="w-full px-2.5 py-2 rounded-xl bg-surface border border-border text-foreground text-xs focus:border-primary focus:outline-none"
            >
              <option value="ALL">Result: All</option>
              <option value="WIN">Winners</option>
              <option value="LOSS">Losers</option>
            </select>
          </div>
        </div>

        {/* Active filter pills / reset row if any filter active */}
        {(dateFilter || yearFilter !== 'ALL' || directionFilter !== 'ALL' || statusFilter !== 'ALL' || outcomeFilter !== 'ALL' || search) && (
          <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted text-[11px] font-medium">Active Filters:</span>
              {dateFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  <Calendar className="w-3 h-3" />
                  Date: {dateFilter}
                  <button onClick={() => setDateFilter('')} className="hover:text-primary-hover ml-1 font-bold">×</button>
                </span>
              )}
              {yearFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  Year: {yearFilter}
                  <button onClick={() => setYearFilter('ALL')} className="hover:text-primary-hover ml-1 font-bold">×</button>
                </span>
              )}
              {directionFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-foreground text-[11px] border border-border">
                  {directionFilter}
                  <button onClick={() => setDirectionFilter('ALL')} className="hover:text-primary ml-1 font-bold">×</button>
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-foreground text-[11px] border border-border">
                  {statusFilter}
                  <button onClick={() => setStatusFilter('ALL')} className="hover:text-primary ml-1 font-bold">×</button>
                </span>
              )}
              {outcomeFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-foreground text-[11px] border border-border">
                  {outcomeFilter}
                  <button onClick={() => setOutcomeFilter('ALL')} className="hover:text-primary ml-1 font-bold">×</button>
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearch('');
                setDateFilter('');
                setYearFilter('ALL');
                setDirectionFilter('ALL');
                setStatusFilter('ALL');
                setOutcomeFilter('ALL');
              }}
              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors font-medium ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
          </div>
        )}
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
                  <th className="pb-3">Open Date & Time</th>
                  <th className="pb-3">Entry</th>
                  <th className="pb-3">Exit</th>
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

                      <td className="py-3 text-muted font-mono whitespace-nowrap">
                        {new Date(t.openTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>

                      <td className="py-3 font-mono text-foreground">{t.entryPrice}</td>
                      <td className="py-3 font-mono text-foreground">{t.exitPrice || '-'}</td>

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

      {/* Delta Exchange India Direct Sync Modal */}
      {deltaModalOpen && (
        <DeltaSyncModal
          isOpen={deltaModalOpen}
          onClose={() => setDeltaModalOpen(false)}
        />
      )}
    </div>
  );
};
