import React, { useState } from 'react';
import { TradeSide, BacktestCandle, BacktestPosition } from '../../types/backtest';
import { formatCurrency } from '../../lib/calculations';
import {
  TrendingUp,
  TrendingDown,
  Sliders,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  RotateCcw,
  ShieldAlert,
  Wallet,
  Settings2,
  X,
  Check
} from 'lucide-react';

interface OneClickExecutionDockProps {
  currentCandle: BacktestCandle | null;
  virtualBalance: number;
  virtualEquity: number;
  openPosition: BacktestPosition | null;
  onExecuteMarketOrder: (params: {
    side: TradeSide;
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
    riskAmount: number;
  }) => void;
  // Replay playback controls
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  currentIndex?: number;
  totalCandles?: number;
  onSeek?: (index: number) => void;
  isCutMode: boolean;
  onToggleCutMode: () => void;
  currentBarTimeFormatted: string;
  symbol: string;
}

export const OneClickExecutionDock: React.FC<OneClickExecutionDockProps> = ({
  currentCandle,
  virtualBalance,
  virtualEquity,
  openPosition,
  onExecuteMarketOrder,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBack,
  onReset,
  speed,
  onChangeSpeed,
  currentIndex = 0,
  totalCandles = 100,
  onSeek,
  isCutMode,
  onToggleCutMode,
  currentBarTimeFormatted,
  symbol
}) => {
  const [lotSize, setLotSize] = useState<number>(1);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);

  // Preset rules for SL & TP
  const [usePresets, setUsePresets] = useState<boolean>(true);
  const [slPips, setSlPips] = useState<number>(30); // 30 pips
  const [tpRatio, setTpRatio] = useState<number>(2.0); // 1:2 RR

  // Calculate live floating PnL
  const floatingPnl = openPosition ? virtualEquity - virtualBalance : 0;
  const isPnlPositive = floatingPnl >= 0;

  // Handle instant one-click order execution
  const handleExecute = (side: TradeSide) => {
    if (!currentCandle) return;
    const currentPrice = currentCandle.close;

    // Pip size based on asset (e.g. 0.1 for Gold, 0.0001 for EURUSD, 1 for BTC)
    const pipSize = symbol.includes('XAU') ? 0.1 : symbol.includes('BTC') ? 1.0 : 0.0001;

    let stopLoss: number | undefined = undefined;
    let takeProfit: number | undefined = undefined;

    if (usePresets && slPips > 0) {
      const slDistance = slPips * pipSize;
      const tpDistance = slDistance * tpRatio;

      if (side === 'BUY') {
        stopLoss = parseFloat((currentPrice - slDistance).toFixed(symbol.includes('BTC') ? 2 : 3));
        takeProfit = parseFloat((currentPrice + tpDistance).toFixed(symbol.includes('BTC') ? 2 : 3));
      } else {
        stopLoss = parseFloat((currentPrice + slDistance).toFixed(symbol.includes('BTC') ? 2 : 3));
        takeProfit = parseFloat((currentPrice - tpDistance).toFixed(symbol.includes('BTC') ? 2 : 3));
      }
    }

    onExecuteMarketOrder({
      side,
      quantity: lotSize,
      stopLoss,
      takeProfit,
      riskAmount: 100
    });
  };

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 p-2.5 px-4 rounded-2xl bg-surface border border-border/40 dark:border-white/[0.08] shadow-lg relative select-none">
      {/* =========================================================================
          LEFT: ONE-CLICK BUY / SELL & LOT SIZE INPUT & PRESETS (Exact FX Replay)
         ========================================================================= */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
        {/* ONE-CLICK BUY BUTTON */}
        <button
          type="button"
          onClick={() => handleExecute('BUY')}
          disabled={!currentCandle}
          title="Instant One-Click Market BUY"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Buy</span>
        </button>

        {/* ONE-CLICK SELL BUTTON */}
        <button
          type="button"
          onClick={() => handleExecute('SELL')}
          disabled={!currentCandle}
          title="Instant One-Click Market SELL"
          className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/25 transition-all disabled:opacity-50 cursor-pointer"
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Sell</span>
        </button>

        {/* LOT SIZE SELECTOR */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-surface-card border border-border/50 dark:border-white/10 shadow-inner">
          <input
            type="number"
            min="0.01"
            max="100"
            step="0.1"
            value={lotSize}
            onChange={(e) => setLotSize(Math.max(0.01, parseFloat(e.target.value) || 1))}
            className="w-12 bg-transparent text-center font-mono font-black text-xs text-foreground focus:outline-none"
            title="Position Lot Size"
          />
        </div>

        {/* PRESETS BUTTON */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
            title="Configure TP / SL Presets"
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              usePresets
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-surface-card border-border/40 text-muted hover:text-foreground'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Presets</span>
          </button>

          {/* Presets Configuration Dropdown Modal */}
          {isPresetsOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3.5 rounded-2xl bg-surface border border-border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs font-bold text-foreground">Trade Execution Presets</span>
                <button
                  onClick={() => setIsPresetsOpen(false)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-muted hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Toggle Auto SL/TP */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-medium text-muted">Auto-attach SL & TP</span>
                <input
                  type="checkbox"
                  checked={usePresets}
                  onChange={(e) => setUsePresets(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                />
              </label>

              {usePresets && (
                <div className="space-y-2 pt-1 border-t border-border/40">
                  {/* SL Pips Input */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Stop Loss (Pips)</span>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={slPips}
                      onChange={(e) => setSlPips(Math.max(1, parseInt(e.target.value, 10) || 10))}
                      className="w-16 px-2 py-0.5 rounded-lg bg-surface-card border border-border text-center font-mono text-xs font-bold text-foreground"
                    />
                  </div>

                  {/* Take Profit RR Ratio */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Take Profit (R:R)</span>
                    <input
                      type="number"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={tpRatio}
                      onChange={(e) => setTpRatio(Math.max(0.5, parseFloat(e.target.value) || 2))}
                      className="w-16 px-2 py-0.5 rounded-lg bg-surface-card border border-border text-center font-mono text-xs font-bold text-foreground"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsPresetsOpen(false)}
                className="w-full py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          CENTER: REPLAY CONTROLS & TIMEFRAME PLAYBACK (FX Replay Layout)
         ========================================================================= */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Step Back 1 Candle */}
        <button
          type="button"
          onClick={onStepBack}
          title="Step Back (Left Arrow)"
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Timeline Range Scrubber Slider (Image Blue Handle) */}
        {onSeek && totalCandles > 1 && (
          <div className="hidden sm:flex items-center gap-2 w-24 md:w-36 lg:w-48 px-1">
            <input
              type="range"
              min={0}
              max={totalCandles - 1}
              value={currentIndex}
              onChange={(e) => onSeek(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-border/60 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              title={`Candle ${currentIndex + 1} of ${totalCandles}`}
            />
          </div>
        )}

        {/* Play / Pause Toggle */}
        <button
          type="button"
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause Replay (Space)' : 'Play Replay (Space)'}
          className={`p-1.5 px-2 rounded-xl text-white font-bold transition-all shadow-md active:scale-95 ${
            isPlaying ? 'bg-amber-500 hover:bg-amber-400' : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Step Forward 1 Candle */}
        <button
          type="button"
          onClick={onStepForward}
          title="Step Forward (Right Arrow)"
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Speed Multiplier Pill */}
        <select
          value={speed}
          onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
          className="px-2 py-1 rounded-lg bg-surface-card border border-border/40 text-foreground font-mono text-xs font-bold focus:outline-none cursor-pointer"
          title="Replay Speed"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1.0x</option>
          <option value={2}>2.0x</option>
          <option value={5}>5.0x</option>
          <option value={10}>10.0x</option>
        </select>

        {/* Cut / Bar Replay Scissors Tool */}
        <button
          type="button"
          onClick={onToggleCutMode}
          title={isCutMode ? 'Cancel Cut Mode (Esc)' : 'Cut to Specific Candle (FX Replay style)'}
          className={`p-1.5 rounded-lg transition-all ${
            isCutMode
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
              : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        {/* Reset Replay Button */}
        <button
          type="button"
          onClick={onReset}
          title="Reset Replay Session"
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Current Replay Bar Timestamp */}
        {currentBarTimeFormatted && (
          <span className="hidden 2xl:inline text-[11px] font-mono text-muted px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-border/40">
            {currentBarTimeFormatted}
          </span>
        )}
      </div>

      {/* =========================================================================
          RIGHT: ACCOUNT BALANCE & LIVE FLOATING PNL (Exact FX Replay Style)
         ========================================================================= */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold">
          <span className="text-foreground">
            {formatCurrency(virtualBalance)}
          </span>
          <span className="text-muted">•</span>
          <span className={isPnlPositive ? 'text-emerald-500' : 'text-rose-500'}>
            {isPnlPositive && floatingPnl > 0 ? `+${formatCurrency(floatingPnl)}` : formatCurrency(floatingPnl)}
          </span>
        </div>
      </div>
    </div>
  );
};
