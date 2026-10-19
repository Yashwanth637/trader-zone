import React, { useState, useEffect, useRef } from 'react';
import {
  BacktestPosition,
  BacktestOrder,
  TradeSide,
  OrderType,
  BacktestCandle
} from '../../types/backtest';
import { formatCurrency } from '../../lib/calculations';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  XCircle,
  DollarSign,
  X,
  SlidersHorizontal
} from 'lucide-react';

interface BacktestOrderPanelProps {
  currentCandle: BacktestCandle | null;
  virtualBalance: number;
  virtualEquity: number;
  openPosition: BacktestPosition | null;
  pendingOrders: BacktestOrder[];
  onPlaceOrder: (params: {
    type: OrderType;
    side: TradeSide;
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    riskAmount: number;
  }) => void;
  onClosePosition: () => void;
  onMoveToBreakeven: () => void;
  onCancelOrder: (orderId: string) => void;
  onResetCapital: (amount: number) => void;
  symbol: string;
  presetOrderParams?: {
    entry: number;
    sl: number;
    tp: number;
    side: TradeSide;
  } | null;
  onClosePanel?: () => void;
}

export const BacktestOrderPanel: React.FC<BacktestOrderPanelProps> = ({
  currentCandle,
  virtualBalance,
  virtualEquity,
  openPosition,
  pendingOrders,
  onPlaceOrder,
  onClosePosition,
  onMoveToBreakeven,
  onCancelOrder,
  onResetCapital,
  symbol,
  presetOrderParams,
  onClosePanel
}) => {
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>('');
  // By default, TP & SL are NOT set (user requirement #1)
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [sizingMode, setSizingMode] = useState<'risk' | 'quantity'>('risk');
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [quantity, setQuantity] = useState<string>('1');
  const [showCapitalModal, setShowCapitalModal] = useState<boolean>(false);

  const currentPrice = currentCandle ? currentCandle.close : 0;
  const prevSymbolRef = useRef(symbol);

  // Sync preset parameters from chart Long/Short drawing tool if user explicitly drew one
  useEffect(() => {
    if (presetOrderParams) {
      setStopLoss(presetOrderParams.sl.toString());
      setTakeProfit(presetOrderParams.tp.toString());
      if (orderType === 'LIMIT') {
        setLimitPrice(presetOrderParams.entry.toString());
      }
    }
  }, [presetOrderParams, orderType]);

  // Sync live dragged SL / TP from on-chart position overlay
  useEffect(() => {
    if (openPosition) {
      if (openPosition.stopLoss !== undefined) {
        setStopLoss(openPosition.stopLoss.toString());
      } else {
        setStopLoss('');
      }
      if (openPosition.takeProfit !== undefined) {
        setTakeProfit(openPosition.takeProfit.toString());
      } else {
        setTakeProfit('');
      }
    }
  }, [openPosition?.stopLoss, openPosition?.takeProfit]);

  // Reset limit price when symbol changes, but leave SL/TP blank by default (Requirement #1)
  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      if (currentPrice > 0) {
        setLimitPrice(currentPrice.toString());
      }
      // Keep SL and TP empty by default
      setStopLoss('');
      setTakeProfit('');
    }
  }, [symbol, currentPrice]);

  // Calculate position sizing
  const slNum = parseFloat(stopLoss);
  const targetEntry = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : currentPrice;
  const riskAmount = (virtualBalance * riskPercent) / 100;

  const calculatedQuantity = React.useMemo(() => {
    if (sizingMode === 'quantity') {
      return parseFloat(quantity) || 1;
    }
    if (!slNum || !targetEntry || slNum === targetEntry) return 1;
    const dist = Math.abs(targetEntry - slNum);
    if (dist <= 0) return 1;
    const computed = riskAmount / dist;
    return parseFloat(computed.toFixed(3));
  }, [sizingMode, quantity, slNum, targetEntry, riskAmount]);

  // Quick R:R presets (1:1.5, 1:2, 1:3) if user has set a Stop Loss
  const applyRR = (rrMultiple: number, side: TradeSide) => {
    if (!slNum || !targetEntry) return;
    const slDist = Math.abs(targetEntry - slNum);
    if (side === 'BUY') {
      setTakeProfit((targetEntry + slDist * rrMultiple).toFixed(2));
    } else {
      setTakeProfit((targetEntry - slDist * rrMultiple).toFixed(2));
    }
  };

  const handleExecute = (targetSide: TradeSide) => {
    if (!currentCandle) return;
    const entry = orderType === 'LIMIT' ? parseFloat(limitPrice) : currentPrice;
    if (!entry) return;

    onPlaceOrder({
      type: orderType,
      side: targetSide,
      quantity: calculatedQuantity,
      price: entry,
      // By default undefined unless manually entered by user
      stopLoss: slNum && !isNaN(slNum) && slNum > 0 ? slNum : undefined,
      takeProfit: parseFloat(takeProfit) && !isNaN(parseFloat(takeProfit)) && parseFloat(takeProfit) > 0 ? parseFloat(takeProfit) : undefined,
      riskAmount
    });
  };

  return (
    <div className="flex flex-col h-full bg-surface-card border border-border/40 dark:border-white/[0.08] rounded-2xl p-4 space-y-3.5 shadow-xl text-foreground select-none overflow-y-auto">
      {/* Docked Header: Virtual Capital & Adjust (No Cart Methodology) */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Virtual Capital</div>
            <div className="text-base font-black text-foreground" style={{ fontFamily: 'Arial, sans-serif' }}>
              {formatCurrency(virtualEquity)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCapitalModal(!showCapitalModal)}
            className="px-2 py-1 text-[11px] font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
          >
            Adjust
          </button>
          {onClosePanel && (
            <button
              type="button"
              onClick={onClosePanel}
              className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Capital Preset Dropdown */}
      {showCapitalModal && (
        <div className="p-2.5 rounded-xl bg-surface border border-border/40 dark:border-white/[0.08] flex items-center justify-between gap-1 animate-in fade-in duration-150">
          {[10000, 25000, 50000, 100000].map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                onResetCapital(amt);
                setShowCapitalModal(false);
              }}
              className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                virtualBalance === amt
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-card text-muted hover:text-foreground'
              }`}
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              ${amt / 1000}k
            </button>
          ))}
        </div>
      )}

      {/* Active Position Summary (if any) */}
      {openPosition && (
        <div className="p-3 rounded-xl bg-surface border border-primary/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 text-[10px] font-black rounded ${
                  openPosition.side === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {openPosition.side === 'BUY' ? 'LONG' : 'SHORT'}
              </span>
              <span className="text-xs font-bold text-foreground" style={{ fontFamily: 'Arial, sans-serif' }}>
                {openPosition.quantity} units
              </span>
            </div>

            <div
              className={`text-xs font-bold ${openPosition.currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {openPosition.currentPnl >= 0 ? '+' : ''}
              {formatCurrency(openPosition.currentPnl)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-muted bg-surface-card p-2 rounded-lg border border-border/40 dark:border-white/[0.06]">
            <div>
              <div className="text-muted">Entry</div>
              <div className="text-foreground font-semibold" style={{ fontFamily: 'Arial, sans-serif' }}>
                {openPosition.entryPrice}
              </div>
            </div>
            <div>
              <div className="text-muted">Stop Loss</div>
              <div className="text-rose-400 font-semibold" style={{ fontFamily: 'Arial, sans-serif' }}>
                {openPosition.stopLoss || 'None'}
              </div>
            </div>
            <div>
              <div className="text-muted">Take Profit</div>
              <div className="text-emerald-400 font-semibold" style={{ fontFamily: 'Arial, sans-serif' }}>
                {openPosition.takeProfit || 'None'}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onMoveToBreakeven}
              disabled={openPosition.isBreakEven}
              title="Move Stop Loss to Entry Price"
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-surface hover:bg-surface-elevated border border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground disabled:opacity-40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>{openPosition.isBreakEven ? 'At BE' : 'Breakeven'}</span>
            </button>
            <button
              type="button"
              onClick={onClosePosition}
              title="Close position at current market price"
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>
      )}

      {/* Order Type Toggle (Market / Limit) */}
      <div className="grid grid-cols-2 p-1 bg-surface rounded-xl border border-border/40 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => setOrderType('MARKET')}
          className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            orderType === 'MARKET' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
          }`}
        >
          Market Order
        </button>
        <button
          type="button"
          onClick={() => {
            setOrderType('LIMIT');
            if (!limitPrice && currentPrice > 0) setLimitPrice(currentPrice.toString());
          }}
          className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            orderType === 'LIMIT' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
          }`}
        >
          Limit Order
        </button>
      </div>

      {/* Limit Price Input if Limit Order */}
      {orderType === 'LIMIT' && (
        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">
            Limit Price
          </label>
          <input
            type="number"
            step="any"
            value={limitPrice}
            onChange={e => setLimitPrice(e.target.value)}
            placeholder={currentPrice.toString()}
            className="w-full px-3 py-1.5 rounded-xl bg-surface border border-border/40 dark:border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary"
            style={{ fontFamily: 'Arial, sans-serif' }}
          />
        </div>
      )}

      {/* Position Sizing & Risk Controls */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="font-semibold">Position Sizing</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSizingMode('risk')}
              className={`text-[10px] font-bold cursor-pointer ${
                sizingMode === 'risk' ? 'text-primary' : 'text-muted hover:text-foreground'
              }`}
            >
              % Risk
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => setSizingMode('quantity')}
              className={`text-[10px] font-bold cursor-pointer ${
                sizingMode === 'quantity' ? 'text-primary' : 'text-muted hover:text-foreground'
              }`}
            >
              Fixed Units
            </button>
          </div>
        </div>

        {sizingMode === 'risk' ? (
          <div className="flex items-center gap-1.5">
            {[0.5, 1, 2, 3].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => setRiskPercent(pct)}
                className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  riskPercent === pct
                    ? 'bg-primary/20 border-primary text-primary-light'
                    : 'bg-surface border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground'
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {pct}%
              </button>
            ))}
            <span className="text-[11px] text-muted ml-1" style={{ fontFamily: 'Arial, sans-serif' }}>
              (${riskAmount.toFixed(0)})
            </span>
          </div>
        ) : (
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Quantity"
            className="w-full px-3 py-1.5 rounded-xl bg-surface border border-border/40 dark:border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary"
            style={{ fontFamily: 'Arial, sans-serif' }}
          />
        )}

        <div className="text-[10px] text-muted text-right" style={{ fontFamily: 'Arial, sans-serif' }}>
          Calc Units: <span className="text-foreground font-bold">{calculatedQuantity}</span>
        </div>
      </div>

      {/* Stop Loss & Take Profit (Blank by default as requested) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-rose-400">Stop Loss</label>
            {stopLoss && (
              <button
                type="button"
                onClick={() => setStopLoss('')}
                className="text-[9px] text-muted hover:text-rose-400 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={stopLoss}
            onChange={e => setStopLoss(e.target.value)}
            placeholder="Optional SL"
            className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-rose-500/30 text-rose-400 text-xs focus:outline-none focus:border-rose-500"
            style={{ fontFamily: 'Arial, sans-serif' }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-emerald-400">Take Profit</label>
            {takeProfit && (
              <button
                type="button"
                onClick={() => setTakeProfit('')}
                className="text-[9px] text-muted hover:text-emerald-400 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={takeProfit}
            onChange={e => setTakeProfit(e.target.value)}
            placeholder="Optional TP"
            className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-emerald-500/30 text-emerald-400 text-xs focus:outline-none focus:border-emerald-500"
            style={{ fontFamily: 'Arial, sans-serif' }}
          />
        </div>
      </div>

      {/* Quick R:R Presets (Only active if user entered Stop Loss) */}
      {stopLoss && (
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <span className="text-[10px] font-semibold text-muted">Preset R:R:</span>
          {[1.5, 2, 3].map(rr => (
            <button
              key={rr}
              type="button"
              onClick={() => applyRR(rr, 'BUY')}
              className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-surface border border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground hover:border-primary transition-colors cursor-pointer"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              1:{rr}
            </button>
          ))}
        </div>
      )}

      {/* Buy & Sell Execution Buttons */}
      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => handleExecute('BUY')}
          className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>BUY / LONG</span>
          </div>
          <span className="text-[10px] font-normal opacity-90" style={{ fontFamily: 'Arial, sans-serif' }}>
            {orderType === 'LIMIT' && limitPrice ? limitPrice : currentPrice}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleExecute('SELL')}
          className="py-3 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/25 transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>SELL / SHORT</span>
          </div>
          <span className="text-[10px] font-normal opacity-90" style={{ fontFamily: 'Arial, sans-serif' }}>
            {orderType === 'LIMIT' && limitPrice ? limitPrice : currentPrice}
          </span>
        </button>
      </div>

      {/* Pending Limit Orders */}
      {pendingOrders.length > 0 && (
        <div className="pt-2 border-t border-border/40 dark:border-white/[0.08] space-y-2">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Pending Orders ({pendingOrders.length})
          </div>
          {pendingOrders.map(order => (
            <div
              key={order.id}
              className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border/40 dark:border-white/[0.08] text-xs"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <div>
                <span className={order.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {order.side} LIMIT
                </span>{' '}
                @ {order.price}
              </div>
              <button
                type="button"
                onClick={() => onCancelOrder(order.id)}
                className="text-muted hover:text-rose-400 cursor-pointer"
                title="Cancel Limit Order"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
