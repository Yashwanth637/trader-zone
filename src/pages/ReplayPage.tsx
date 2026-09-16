import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatSignedPnl } from '../lib/calculations';
import { Trade } from '../types/trade';
import { getCandlesForTrade, ReplayData, ReplayCandle } from '../lib/replayCandles';
import {
  createChart,
  CandlestickSeries,
  ColorType,
  LineStyle,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi
} from 'lightweight-charts';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  PlayCircle,
  Clock,
  Shield,
  Target,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const ReplayPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tradeIdParam = searchParams.get('tradeId');
  const { accountTrades } = useTrading();
  const { theme } = useTheme();

  // Only closed trades can be replayed
  const closedTrades = useMemo(() => {
    return accountTrades.filter(t => t.status === 'CLOSED');
  }, [accountTrades]);

  // Selected trade to replay
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(() => {
    if (tradeIdParam) {
      const found = closedTrades.find(t => t.id === tradeIdParam);
      if (found) return found;
    }
    return closedTrades[0] || null;
  });

  // Timeframe
  const [timeframe, setTimeframe] = useState('15m');
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<any>(null);
  const priceLinesRef = useRef<any[]>([]);
  const initialFittedRef = useRef<string | null>(null);

  // When tradeId in URL changes, select that trade
  useEffect(() => {
    if (tradeIdParam) {
      const found = closedTrades.find(t => t.id === tradeIdParam);
      if (found) setSelectedTrade(found);
    }
  }, [tradeIdParam, closedTrades]);

  // Load candle data whenever selected trade or timeframe changes
  useEffect(() => {
    if (!selectedTrade) return;
    setLoading(true);
    setIsPlaying(false);

    getCandlesForTrade(selectedTrade, timeframe).then(data => {
      setReplayData(data);
      setCurrentStep(data.entryIndex); // start at entry
      setLoading(false);
    });
  }, [selectedTrade, timeframe]);

  // Initialize and mount Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    chartContainerRef.current.innerHTML = '';

    const isDark = theme === 'dark';
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#000000' : '#ffffff' },
        textColor: isDark ? '#a1a1aa' : '#4b5563',
        fontFamily: "'Arial', 'Helvetica', sans-serif"
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }
      },
      crosshair: {
        mode: 0
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      }
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 450
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, [theme]);

  // Manage price lines cleanly: ONLY recreate when trade changes or chart initializes
  useEffect(() => {
    if (!seriesRef.current || !replayData) return;
    const series = seriesRef.current;

    // Remove any previously created price lines
    if (priceLinesRef.current.length > 0) {
      priceLinesRef.current.forEach(line => {
        try {
          series.removePriceLine(line);
        } catch (e) {
          // ignore cleanup errors
        }
      });
      priceLinesRef.current = [];
    }

    const newLines = [];

    // Entry price line
    const entryLine = series.createPriceLine({
      price: replayData.entryPrice,
      color: '#8b5cf6',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `Entry: ${replayData.entryPrice}`
    });
    newLines.push(entryLine);

    // Stop Loss line
    if (replayData.stopLoss) {
      const slLine = series.createPriceLine({
        price: replayData.stopLoss,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Stop Loss: ${replayData.stopLoss}`
      });
      newLines.push(slLine);
    }

    // Take Profit line
    if (replayData.takeProfit) {
      const tpLine = series.createPriceLine({
        price: replayData.takeProfit,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Take Profit: ${replayData.takeProfit}`
      });
      newLines.push(tpLine);
    }

    priceLinesRef.current = newLines;

    // Fit content ONCE per trade when loaded, without resetting during replay ticks
    if (replayData.trade.id !== initialFittedRef.current) {
      initialFittedRef.current = replayData.trade.id;
      chartRef.current?.timeScale().fitContent();
    }
  }, [replayData, theme]);

  // Update chart data & markers as replay progresses - NEVER reframes or duplicates price lines!
  useEffect(() => {
    if (!seriesRef.current || !replayData || replayData.candles.length === 0) return;

    // Slice candles up to currentStep
    const step = Math.min(Math.max(currentStep, 1), replayData.candles.length);
    const visible = replayData.candles.slice(0, step);

    // Format for lightweight-charts: time as UTCTimestamp
    const formatted = visible.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    seriesRef.current.setData(formatted);

    // Markers for Entry and Exit
    const series = seriesRef.current;
    const markers: any[] = [];
    if (step >= replayData.entryIndex && replayData.entryIndex < replayData.candles.length) {
      const entryCandle = replayData.candles[replayData.entryIndex];
      markers.push({
        time: entryCandle.time,
        position: replayData.trade.direction === 'BUY' ? 'belowBar' : 'aboveBar',
        color: '#8b5cf6',
        shape: replayData.trade.direction === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: `ENTRY ${replayData.trade.direction} @ ${replayData.entryPrice}`
      });
    }

    if (step >= replayData.exitIndex && replayData.exitIndex < replayData.candles.length) {
      const exitCandle = replayData.candles[replayData.exitIndex];
      const isWin = replayData.trade.netPnl >= 0;
      markers.push({
        time: exitCandle.time,
        position: replayData.trade.direction === 'BUY' ? 'aboveBar' : 'belowBar',
        color: isWin ? '#10b981' : '#ef4444',
        shape: replayData.trade.direction === 'BUY' ? 'arrowDown' : 'arrowUp',
        text: `EXIT @ ${replayData.exitPrice} (${formatSignedPnl(replayData.trade.netPnl)})`
      });
    }

    try {
      if (markersRef.current) {
        markersRef.current.setMarkers(markers);
      } else {
        markersRef.current = createSeriesMarkers(series, markers);
      }
    } catch (e) {
      // Ignore marker re-binding warning
    }
  }, [replayData, currentStep]);

  // Replay play/pause loop timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && replayData) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= replayData.candles.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, replayData]);

  // Keyboard shortcuts (Space = Play/Pause, Right = Step, R = Reset)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (replayData) setCurrentStep(prev => Math.min(prev + 1, replayData.candles.length));
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        if (replayData) setCurrentStep(replayData.entryIndex);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [replayData]);

  // Live floating P&L calculation during replay
  const floatingStats = useMemo(() => {
    if (!replayData || currentStep < replayData.entryIndex) {
      return { pnl: 0, pips: 0, status: 'Pre-Entry Setup' };
    }

    const currentCandle = replayData.candles[Math.min(currentStep - 1, replayData.candles.length - 1)];
    if (!currentCandle) return { pnl: 0, pips: 0, status: 'Pre-Entry' };

    if (currentStep >= replayData.exitIndex) {
      return {
        pnl: replayData.trade.netPnl,
        pips: replayData.trade.pips || 0,
        status: 'Trade Completed'
      };
    }

    // In-trade floating price
    const currentPrice = currentCandle.close;
    const diff = replayData.trade.direction === 'BUY'
      ? currentPrice - replayData.entryPrice
      : replayData.entryPrice - currentPrice;

    const sym = replayData.trade.symbol.toUpperCase();
    let pipMultiplier = 10000;
    if (sym.includes('JPY')) pipMultiplier = 100;
    else if (sym.includes('XAU') || sym.includes('GOLD')) pipMultiplier = 10;
    else if (sym.includes('BTC') || sym.includes('US30')) pipMultiplier = 1;

    const floatingPips = parseFloat((diff * pipMultiplier).toFixed(1));
    let pipValue = 10;
    if (sym.includes('BTC')) pipValue = 1;
    const floatingPnl = parseFloat((floatingPips * pipValue * replayData.trade.lotSize).toFixed(2));

    return {
      pnl: floatingPnl,
      pips: floatingPips,
      status: 'Trade In Progress'
    };
  }, [replayData, currentStep]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <PlayCircle className="w-6 h-6 text-primary" />
            <span>Trade Replay Simulator</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Select any trade from your journal to replay the exact price action, entry setup, and exit.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">Timeframe:</span>
          <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl shadow-sm">
            {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  timeframe === tf
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Studio: Left Trade List (1/3) & Right Replay Engine (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Specific Trades Catalog */}
        <div className="space-y-4">
          <div className="premium-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Your Logged Trades ({closedTrades.length})
              </span>
              <span className="text-[10px] text-muted">Select to Replay</span>
            </div>

            {closedTrades.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted border border-dashed border-border rounded-xl">
                No closed trades available. Log trades in your journal to replay them here!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {closedTrades.map(trade => {
                  const isSelected = selectedTrade?.id === trade.id;
                  const isWin = trade.netPnl >= 0;

                  return (
                    <div
                      key={trade.id}
                      onClick={() => {
                        setSelectedTrade(trade);
                        setSearchParams({ tradeId: trade.id });
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-sm shadow-primary/20 ring-1 ring-primary/40'
                          : 'bg-surface border-border hover:border-primary/40 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{trade.symbol}</span>
                          <Badge variant={trade.direction === 'BUY' ? 'buy' : 'sell'} size="sm">
                            {trade.direction}
                          </Badge>
                          <span className="text-[10px] font-mono text-muted">{trade.lotSize}L</span>
                        </div>

                        <div className={`font-mono font-black text-xs ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatCurrency(trade.netPnl)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted mb-2.5">
                        <div>Entry: <strong className="text-foreground">{trade.entryPrice}</strong></div>
                        <div>Exit: <strong className="text-foreground">{trade.exitPrice || '-'}</strong></div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/70 text-[10px] text-muted">
                        <span>{new Date(trade.openTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>

                        <Button
                          size="sm"
                          variant={isSelected ? 'primary' : 'outline'}
                          className="h-6 text-[10px] px-2.5"
                          icon={<Play className="w-3 h-3" />}
                        >
                          {isSelected ? 'Replaying' : 'Replay'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Lightweight Charts Replay Engine */}
        <div className="lg:col-span-2 space-y-4">
          <div className="premium-card p-5 space-y-4">
            {/* Active Replay Trade Banner & Floating P&L */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              {selectedTrade ? (
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl font-black text-foreground">{selectedTrade.symbol}</span>
                    <Badge variant={selectedTrade.direction === 'BUY' ? 'buy' : 'sell'}>
                      {selectedTrade.direction}
                    </Badge>
                    <span className="text-xs font-mono text-muted">{selectedTrade.lotSize} Lots</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border text-muted font-bold font-mono">
                      {timeframe}
                    </span>
                    {replayData && (
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                        replayData.isRealMarketData
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          replayData.isRealMarketData ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`} />
                        {replayData.isRealMarketData
                          ? `Real Market Data (${replayData.source})`
                          : 'Simulation Model'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1 flex items-center gap-3">
                    <span>Entry: <strong className="text-foreground font-mono">{selectedTrade.entryPrice}</strong></span>
                    {selectedTrade.stopLoss && (
                      <span>SL: <strong className="text-rose-500 font-mono">{selectedTrade.stopLoss}</strong></span>
                    )}
                    {selectedTrade.takeProfit && (
                      <span>TP: <strong className="text-emerald-500 font-mono">{selectedTrade.takeProfit}</strong></span>
                    )}
                    <span>Target: <strong className="text-foreground font-mono">{selectedTrade.exitPrice}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted">Select a trade to start simulation</div>
              )}

              {/* Dynamic Live Floating P&L Indicator */}
              <div className="p-3 rounded-xl bg-surface border border-border shadow-sm text-right min-w-[170px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  {floatingStats.status}
                </div>
                <div className={`text-xl font-black font-mono mt-0.5 ${
                  floatingStats.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {formatSignedPnl(floatingStats.pnl)}
                </div>
                <div className="text-[10px] font-mono text-muted">
                  Floating Pips: {floatingStats.pips}
                </div>
              </div>
            </div>

            {/* TradingView Lightweight Chart Container */}
            <div className="w-full h-[450px] relative rounded-xl overflow-hidden border border-border bg-background">
              {loading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-xs font-bold text-primary flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Fetching real market historical candles from internet...
                  </div>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full h-full" />
            </div>

            {/* Playback Controls & Scrubber */}
            <div className="space-y-3 pt-2">
              {/* Progress Slider */}
              {replayData && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted">Pre-Trade</span>
                  <input
                    type="range"
                    min="1"
                    max={replayData.candles.length}
                    value={currentStep}
                    onChange={e => {
                      setIsPlaying(false);
                      setCurrentStep(parseInt(e.target.value));
                    }}
                    className="flex-1 accent-primary h-1.5 bg-border rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    {replayData.candles[currentStep - 1] && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border text-foreground">
                        {new Date(replayData.candles[currentStep - 1].time * 1000).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted">
                      Candle {currentStep} / {replayData.candles.length}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  </Button>

                  <button
                    onClick={() => {
                      if (replayData) setCurrentStep(prev => Math.min(prev + 1, replayData.candles.length));
                    }}
                    disabled={!replayData || currentStep >= (replayData?.candles.length || 0)}
                    className="p-2 rounded-xl bg-surface border border-border text-foreground hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 shadow-sm"
                    title="Next Candle (Right Arrow)"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (replayData) setCurrentStep(prev => Math.max(prev - 1, 1));
                    }}
                    disabled={currentStep <= 1}
                    className="p-2 rounded-xl bg-surface border border-border text-foreground hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 shadow-sm"
                    title="Previous Candle"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      if (replayData) setCurrentStep(replayData.entryIndex);
                    }}
                    className="p-2 rounded-xl bg-surface border border-border text-foreground hover:bg-black/5 dark:hover:bg-white/10 shadow-sm"
                    title="Reset to Entry (R)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted font-medium">Speed:</span>
                  <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-xl shadow-sm">
                    {[1, 2, 5, 10].map(s => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                          speed === s
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Trade Data Card */}
          {selectedTrade && (
            <div className="premium-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Trade Metadata & Notes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted block">Planned R:R:</span>
                  <strong className="text-foreground font-mono">1:{selectedTrade.plannedRR || '-'}</strong>
                </div>
                <div>
                  <span className="text-muted block">Realized R:R:</span>
                  <strong className="text-primary font-mono font-bold">1:{selectedTrade.realizedRR || '-'}</strong>
                </div>
                <div>
                  <span className="text-muted block">Strategy:</span>
                  <strong className="text-foreground">{selectedTrade.strategyName || 'Discretionary'}</strong>
                </div>
                <div>
                  <span className="text-muted block">Emotion:</span>
                  <strong className="text-foreground">{selectedTrade.emotionalState || 'Disciplined'}</strong>
                </div>
              </div>

              {selectedTrade.notes && (
                <div className="p-3 rounded-xl bg-surface border border-border text-xs text-foreground leading-relaxed">
                  <strong>Notes:</strong> {selectedTrade.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
