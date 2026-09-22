import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  DollarSign
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
  presetOrderParams
}) => {
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [side, setSide] = useState<TradeSide>('BUY');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [sizingMode, setSizingMode] = useState<'risk' | 'quantity'>('risk');
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [quantity, setQuantity] = useState<string>('1');
  const [showCapitalModal, setShowCapitalModal] = useState<boolean>(false);

  const currentPrice = currentCandle ? currentCandle.close : 0;
  const prevSymbolRef = useRef(symbol);
  const prevSideRef = useRef(side);

  // Sync preset parameters from chart Long/Short drawing tool if available
  useEffect(() => {
    if (presetOrderParams) {
      setSide(presetOrderParams.side);
      setStopLoss(presetOrderParams.sl.toString());
      setTakeProfit(presetOrderParams.tp.toString());
      if (orderType === 'LIMIT') {
        setLimitPrice(presetOrderParams.entry.toString());
      }
    }
  }, [presetOrderParams, orderType]);

  // Sync live dragged SL / TP from chart (Item 7)
  useEffect(() => {
    if (openPosition) {
      if (openPosition.stopLoss !== undefined) {
        setStopLoss(openPosition.stopLoss.toString());
      }
      if (openPosition.takeProfit !== undefined) {
        setTakeProfit(openPosition.takeProfit.toString());
      }
    }
  }, [openPosition?.stopLoss, openPosition?.takeProfit]);

  // Helper to format price with appropriate decimal precision based on asset magnitude
  const formatPrice = useCallback((val: number) => {
    if (!val || isNaN(val)) return '0.00';
    if (val < 2) return val.toFixed(4);
    if (val < 100) return val.toFixed(3);
    return val.toFixed(2);
  }, []);

  // Reset SL & TP whenever symbol changes, side changes, or scale mismatch is detected (e.g. BTC 100k -> Gold 3.8k)
  useEffect(() => {
    const symbolChanged = prevSymbolRef.current !== symbol;
    const sideChanged = prevSideRef.current !== side;
    const slVal = parseFloat(stopLoss || '0');
    const scaleMismatch = slVal > 0 && currentPrice > 0 && Math.abs(currentPrice - slVal) / currentPrice > 0.35;

    if (symbolChanged || sideChanged || scaleMismatch || !stopLoss) {
      prevSymbolRef.current = symbol;
      prevSideRef.current = side;

      if (currentPrice > 0) {
        const defaultRisk = currentPrice * 0.01;
        if (side === 'BUY') {
          setStopLoss(formatPrice(currentPrice - defaultRisk));
          setTakeProfit(formatPrice(currentPrice + defaultRisk * 2));
        } else {
          setStopLoss(formatPrice(currentPrice + defaultRisk));
          setTakeProfit(formatPrice(currentPrice - defaultRisk * 2));
        }
        setLimitPrice(formatPrice(currentPrice));
      }
    }
  }, [symbol, side, currentPrice, formatPrice]);

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

  // Set Quick R:R presets (1:1.5, 1:2, 1:3)
  const applyRR = (rrMultiple: number) => {
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
      stopLoss: slNum ? slNum : undefined,
      takeProfit: parseFloat(takeProfit) ? parseFloat(takeProfit) : undefined,
      riskAmount
    });
  };

  return (
    <div className="flex flex-col h-full bg-surface-card border border-border/40 dark:border-white/[0.08] rounded-2xl p-4 space-y-4 shadow-xl text-foreground select-none">
      {/* Account Balance Widget */}
      <div className="bg-surface-elevated/70 p-3 rounded-xl border border-border/40 dark:border-white/[0.06]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            Virtual Capital
          </span>
          <button
            type="button"
            onClick={() => setShowCapitalModal(!showCapitalModal)}
            className="text-[10px] text-primary hover:underline font-bold"
          >
            Adjust
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <div
              className="text-xl font-black text-foreground"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {formatCurrency(virtualEquity)}
            </div>
            <div
              className="text-[10px] text-muted"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Bal: {formatCurrency(virtualBalance)}
            </div>
          </div>

          {openPosition && (
            <div className="text-right">
              <div
                className={`text-sm font-bold ${
                  openPosition.currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {openPosition.currentPnl >= 0 ? '+' : ''}
                {formatCurrency(openPosition.currentPnl)}
              </div>
              <div
                className="text-[10px] text-muted"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                ({openPosition.currentR >= 0 ? '+' : ''}{openPosition.currentR}R)
              </div>
            </div>
          )}
        </div>

        {/* Quick Capital Preset Dropdown */}
        {showCapitalModal && (
          <div className="mt-2 pt-2 border-t border-border/40 dark:border-white/[0.08] flex items-center justify-between gap-1">
            {[10000, 25000, 50000, 100000].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  onResetCapital(amt);
                  setShowCapitalModal(false);
                }}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  virtualBalance === amt
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:text-foreground'
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                ${amt / 1000}k
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Position Card */}
      {openPosition && (
        <div className="p-3 rounded-xl bg-gradient-to-br from-surface-elevated to-surface border border-primary/40 space-y-2.5">
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
              <span
                className="text-xs font-bold text-foreground"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {openPosition.quantity} units
              </span>
            </div>

            <div
              className={`text-xs font-bold ${
                openPosition.currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {openPosition.currentPnl >= 0 ? '+' : ''}
              {formatCurrency(openPosition.currentPnl)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-muted bg-surface/80 p-2 rounded-lg border border-border/40 dark:border-white/[0.06]">
            <div>
              <div className="text-muted">Entry</div>
              <div
                className="text-foreground font-semibold"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {openPosition.entryPrice}
              </div>
            </div>
            <div>
              <div className="text-muted">Stop Loss</div>
              <div
                className="text-rose-400 font-semibold"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {openPosition.stopLoss || 'None'}
              </div>
            </div>
            <div>
              <div className="text-muted">Take Profit</div>
              <div
                className="text-emerald-400 font-semibold"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
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
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-surface hover:bg-surface-elevated border border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>{openPosition.isBreakEven ? 'At BE' : 'Breakeven'}</span>
            </button>
            <button
              type="button"
              onClick={onClosePosition}
              title="Close position at current market price"
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition-colors flex items-center justify-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Close Market</span>
            </button>
          </div>
        </div>
      )}

      {/* Order Placement Form */}
      <div className="space-y-3">
        {/* Order Type Toggle */}
        <div className="grid grid-cols-2 p-1 bg-surface-elevated rounded-xl border border-border/40 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setOrderType('MARKET')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              orderType === 'MARKET' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
            }`}
          >
            Market Order
          </button>
          <button
            type="button"
            onClick={() => setOrderType('LIMIT')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
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
              Limit Entry Price
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

        {/* Sizing & Risk Controls */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="font-semibold">Position Sizing</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSizingMode('risk')}
                className={`text-[10px] font-bold ${
                  sizingMode === 'risk' ? 'text-primary' : 'text-muted hover:text-foreground'
                }`}
              >
                % Risk
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => setSizingMode('quantity')}
                className={`text-[10px] font-bold ${
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
                  className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-colors ${
                    riskPercent === pct
                      ? 'bg-primary/20 border-primary text-primary-light'
                      : 'bg-surface border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground'
                  }`}
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  {pct}%
                </button>
              ))}
              <span
                className="text-[11px] text-muted ml-1"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
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

          <div
            className="text-[10px] text-muted text-right"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            Calc Units: <span className="text-foreground font-bold">{calculatedQuantity}</span>
          </div>
        </div>

        {/* Stop Loss & Take Profit */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-rose-400 mb-1">Stop Loss</label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              placeholder="SL Price"
              className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-rose-500/40 text-rose-400 text-xs focus:outline-none focus:border-rose-500"
              style={{ fontFamily: 'Arial, sans-serif' }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-emerald-400 mb-1">Take Profit</label>
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={e => setTakeProfit(e.target.value)}
              placeholder="TP Price"
              className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-emerald-500/40 text-emerald-400 text-xs focus:outline-none focus:border-emerald-500"
              style={{ fontFamily: 'Arial, sans-serif' }}
            />
          </div>
        </div>

        {/* Quick R:R Presets */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <span className="text-[10px] font-semibold text-muted">Preset R:R:</span>
          {[1.5, 2, 3].map(rr => (
            <button
              key={rr}
              type="button"
              onClick={() => applyRR(rr)}
              className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-surface border border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground hover:border-primary transition-colors"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              1:{rr}
            </button>
          ))}
        </div>

        {/* Buy & Sell Execution Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => handleExecute('BUY')}
            className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY / LONG</span>
            </div>
            <span
              className="text-[10px] font-normal opacity-90"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {orderType === 'LIMIT' && limitPrice ? limitPrice : currentPrice}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleExecute('SELL')}
            className="py-3 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/25 transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SELL / SHORT</span>
            </div>
            <span
              className="text-[10px] font-normal opacity-90"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {orderType === 'LIMIT' && limitPrice ? limitPrice : currentPrice}
            </span>
          </button>
        </div>
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
                className="text-muted hover:text-rose-400"
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
