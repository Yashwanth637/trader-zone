import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Direction, TradeStatus, AssetClass, EmotionalState, MistakeTag } from '../../types/trade';
import { calculatePnlFromPrices, calculatePips, formatSignedPnl, formatCurrency } from '../../lib/calculations';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTradeModal: React.FC<AddTradeModalProps> = ({ isOpen, onClose }) => {
  const { addTrade, strategies, activeAccountId, accounts } = useTrading();

  const [symbol, setSymbol] = useState('XAUUSD');
  const [direction, setDirection] = useState<Direction>('BUY');
  const [status, setStatus] = useState<TradeStatus>('CLOSED');
  const [lotSize, setLotSize] = useState('1.0');
  const [entryPrice, setEntryPrice] = useState('2500.00');
  const [exitPrice, setExitPrice] = useState('2512.50');
  const [stopLoss, setStopLoss] = useState('2492.00');
  const [takeProfit, setTakeProfit] = useState('2520.00');
  const [openTime, setOpenTime] = useState(new Date().toISOString().slice(0, 16));
  const [closeTime, setCloseTime] = useState(new Date().toISOString().slice(0, 16));
  const [commission, setCommission] = useState('0.00');
  const [swap, setSwap] = useState('0.00');
  const [strategyId, setStrategyId] = useState('');
  const [emotionalState, setEmotionalState] = useState<EmotionalState>('Disciplined');
  const [notes, setNotes] = useState('');
  const [chartBeforeUrl, setChartBeforeUrl] = useState('');
  const [chartAfterUrl, setChartAfterUrl] = useState('');
  const [targetAccount, setTargetAccount] = useState(activeAccountId === 'all' ? accounts[0]?.id : activeAccountId);

  // Live calculation
  const parsedEntry = parseFloat(entryPrice) || 0;
  const parsedExit = status === 'CLOSED' ? parseFloat(exitPrice) || 0 : undefined;
  const parsedLots = parseFloat(lotSize) || 1.0;
  const parsedComm = parseFloat(commission) || 0;
  const parsedSwap = parseFloat(swap) || 0;

  const pnlCalc = parsedExit
    ? calculatePnlFromPrices(symbol, direction, parsedLots, parsedEntry, parsedExit, parsedComm, parsedSwap)
    : { grossPnl: 0, netPnl: 0, pips: 0 };

  const parsedSL = parseFloat(stopLoss) || 0;
  const parsedTP = parseFloat(takeProfit) || 0;
  const plannedRR = parsedSL && parsedEntry
    ? Math.abs((parsedTP - parsedEntry) / (parsedEntry - parsedSL))
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let assetClass: AssetClass = 'Forex';
    const sym = symbol.toUpperCase();
    if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('OIL')) assetClass = 'Commodities';
    else if (sym.includes('BTC') || sym.includes('ETH')) assetClass = 'Crypto';
    else if (sym.includes('US30') || sym.includes('NAS') || sym.includes('SPX')) assetClass = 'Indices';

    const selectedStrat = strategies.find(s => s.id === strategyId);

    addTrade({
      ticket: `${Math.floor(1000000 + Math.random() * 9000000)}`,
      accountId: targetAccount,
      symbol: sym,
      assetClass,
      direction,
      status,
      lotSize: parsedLots,
      entryPrice: parsedEntry,
      exitPrice: parsedExit,
      stopLoss: parsedSL || undefined,
      takeProfit: parsedTP || undefined,
      openTime: new Date(openTime).toISOString(),
      closeTime: status === 'CLOSED' ? new Date(closeTime).toISOString() : undefined,
      grossPnl: pnlCalc.grossPnl,
      commission: parsedComm,
      swap: parsedSwap,
      netPnl: pnlCalc.netPnl,
      pips: pnlCalc.pips,
      plannedRR: plannedRR ? parseFloat(plannedRR.toFixed(2)) : undefined,
      realizedRR: parsedExit && parsedSL
        ? parseFloat(((parsedExit - parsedEntry) / (parsedEntry - parsedSL)).toFixed(2))
        : undefined,
      strategyId: selectedStrat?.id,
      strategyName: selectedStrat?.name,
      session: 'London',
      setupTags: selectedStrat ? [selectedStrat.name] : ['Discretionary'],
      mistakeTags: [],
      emotionalState,
      executionRating: pnlCalc.netPnl >= 0 ? 5 : 3,
      notes,
      chartBeforeUrl: chartBeforeUrl || undefined,
      chartAfterUrl: chartAfterUrl || undefined
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log New Trade" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top bar: Symbol, Direction, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Symbol / Pair</label>
            <input
              type="text"
              required
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. XAUUSD, EURUSD"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('BUY')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  direction === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                    : 'bg-surface-card text-slate-400 border-border hover:text-white'
                }`}
              >
                BUY (LONG)
              </button>
              <button
                type="button"
                onClick={() => setDirection('SELL')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  direction === 'SELL'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm'
                    : 'bg-surface-card text-slate-400 border-border hover:text-white'
                }`}
              >
                SELL (SHORT)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Trade Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TradeStatus)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            >
              <option value="CLOSED">CLOSED</option>
              <option value="OPEN">OPEN (Running)</option>
            </select>
          </div>
        </div>

        {/* Pricing: Lots, Entry, Exit */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Lot Size</label>
            <input
              type="number"
              step="0.01"
              required
              value={lotSize}
              onChange={e => setLotSize(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Entry Price</label>
            <input
              type="number"
              step="0.00001"
              required
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Exit Price {status === 'OPEN' && '(Optional)'}
            </label>
            <input
              type="number"
              step="0.00001"
              disabled={status === 'OPEN'}
              value={exitPrice}
              onChange={e => setExitPrice(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none disabled:opacity-40"
            />
          </div>
        </div>

        {/* Risk & Target: SL, TP, Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Stop Loss</label>
            <input
              type="number"
              step="0.00001"
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Take Profit</label>
            <input
              type="number"
              step="0.00001"
              value={takeProfit}
              onChange={e => setTakeProfit(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Trading Strategy</label>
            <select
              value={strategyId}
              onChange={e => setStrategyId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            >
              <option value="">-- Select Strategy --</option>
              {strategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fees: Commission & Swap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Commission ($) <span className="text-muted font-normal">(Optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={commission}
              onChange={e => setCommission(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Swap / Financing ($) <span className="text-muted font-normal">(Optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={swap}
              onChange={e => setSwap(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        {status === 'CLOSED' && (
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            pnlCalc.netPnl >= 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Calculated Net P&L</div>
              <div className="text-xl font-black font-mono">
                {formatSignedPnl(pnlCalc.netPnl)}
              </div>
              {(parsedComm > 0 || parsedSwap !== 0) && (
                <div className="text-[10.5px] opacity-75 mt-0.5 font-mono">
                  Gross: {formatSignedPnl(pnlCalc.grossPnl)}
                  {parsedComm > 0 && ` | Comm: -${formatCurrency(parsedComm)}`}
                  {parsedSwap !== 0 && ` | Swap: ${formatSignedPnl(parsedSwap)}`}
                </div>
              )}
            </div>
            <div className="text-right text-xs">
              <div>Pips: <strong className="font-mono">{pnlCalc.pips}</strong></div>
              {plannedRR && <div>Planned R:R: <strong className="font-mono">1:{plannedRR.toFixed(2)}</strong></div>}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Open Time</label>
            <input
              type="datetime-local"
              value={openTime}
              onChange={e => setOpenTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Close Time</label>
            <input
              type="datetime-local"
              disabled={status === 'OPEN'}
              value={closeTime}
              onChange={e => setCloseTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none disabled:opacity-40"
            />
          </div>
        </div>

        {/* Psychology & Screenshots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Psychological State</label>
            <select
              value={emotionalState}
              onChange={e => setEmotionalState(e.target.value as EmotionalState)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            >
              <option value="Disciplined">Disciplined</option>
              <option value="Calm">Calm</option>
              <option value="Confident">Confident</option>
              <option value="FOMO">FOMO</option>
              <option value="Revenge">Revenge</option>
              <option value="Impatient">Impatient</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Chart Screenshot URL</label>
            <input
              type="url"
              value={chartBeforeUrl}
              onChange={e => setChartBeforeUrl(e.target.value)}
              placeholder="https://... image link or TradingView snapshot"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Trade Notes & Execution Review</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Setup reason, market structure, why did you enter here?"
            className="w-full px-3.5 py-2 rounded-xl bg-surface-card border border-border text-white text-sm focus:border-primary focus:outline-none resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Trade Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
};
