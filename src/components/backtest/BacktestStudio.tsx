import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BacktestCandle,
  BacktestDrawing,
  DrawingType,
  TradeSide,
  OrderType
} from '../../types/backtest';
import {
  SUPPORTED_ASSETS,
  TIMEFRAMES,
  fetchRealHistoricalCandles
} from '../../lib/backtestDataService';
import { BacktestEngine } from '../../lib/backtestEngine';
import { BacktestChart } from './BacktestChart';
import { DrawingToolbar } from './DrawingToolbar';
import { ReplayControls } from './ReplayControls';
import { BacktestOrderPanel } from './BacktestOrderPanel';
import { BacktestTradeLog } from './BacktestTradeLog';
import {
  Layers,
  Maximize2,
  Minimize2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  PenTool
} from 'lucide-react';

export const BacktestStudio: React.FC = () => {
  // Strategy & Asset State
  const [strategyName, setStrategyName] = useState<string>('ICT Silver Bullet');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15m');

  // Real Historical Market Candles
  const [candles, setCandles] = useState<BacktestCandle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Replay State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [isCutMode, setIsCutMode] = useState<boolean>(false);
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const isReplayModeRef = useRef<boolean>(false);
  const replayTargetTimeRef = useRef<number | null>(null);

  const updateReplayMode = useCallback((active: boolean, targetTimestampSec?: number) => {
    setIsReplayMode(active);
    isReplayModeRef.current = active;
    if (active && targetTimestampSec !== undefined) {
      replayTargetTimeRef.current = targetTimestampSec;
    } else if (!active) {
      replayTargetTimeRef.current = null;
    }
  }, []);

  // Drawings State & Toolbar Visibility (Item 5)
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<DrawingType>('cursor');
  const [drawings, setDrawings] = useState<BacktestDrawing[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // Order sync from Long/Short position tool
  const [presetOrderParams, setPresetOrderParams] = useState<{
    entry: number;
    sl: number;
    tp: number;
    side: TradeSide;
  } | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const studioContainerRef = useRef<HTMLDivElement>(null);

  // Simulation Engine Ref
  const engineRef = useRef<BacktestEngine>(
    new BacktestEngine(10000, selectedAssetId, selectedTimeframe, strategyName)
  );

  // Engine reactive mirror state for React render updates
  const [engineState, setEngineState] = useState<{
    virtualBalance: number;
    virtualEquity: number;
    openPosition: any;
    pendingOrders: any[];
    closedTrades: any[];
    stats: any;
  }>({
    virtualBalance: 10000,
    virtualEquity: 10000,
    openPosition: null,
    pendingOrders: [],
    closedTrades: [],
    stats: engineRef.current.getStats()
  });

  const syncEngineState = useCallback(() => {
    const balance = engineRef.current.balance;
    const equity = engineRef.current.equity;
    const openPosition = engineRef.current.openPosition;
    const pendingOrders = [...engineRef.current.pendingOrders];
    const closedTrades = [...engineRef.current.closedTrades];
    const stats = engineRef.current.getStats();

    setEngineState({
      virtualBalance: balance,
      virtualEquity: equity,
      openPosition,
      pendingOrders,
      closedTrades,
      stats
    });

    // Item 3: Persist strategy backtest trades & capital to localStorage
    const sessionKey = `tz_backtest_session_${strategyName}`;
    try {
      localStorage.setItem(
        sessionKey,
        JSON.stringify({
          closedTrades,
          balance,
          equity,
          initialBalance: engineRef.current.initialBalance,
          strategyName
        })
      );
    } catch (e) {
      console.error('Failed to persist backtest session', e);
    }
  }, [strategyName]);

  // Item 3: Hydrate saved strategy backtest session from localStorage
  useEffect(() => {
    const sessionKey = `tz_backtest_session_${strategyName}`;
    const saved = localStorage.getItem(sessionKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (Array.isArray(data.closedTrades)) {
          engineRef.current.closedTrades = data.closedTrades;
        }
        if (typeof data.balance === 'number') {
          engineRef.current.balance = data.balance;
        }
        if (typeof data.equity === 'number') {
          engineRef.current.equity = data.equity;
        }
        if (typeof data.initialBalance === 'number') {
          engineRef.current.initialBalance = data.initialBalance;
        }
        syncEngineState();
      } catch (e) {
        console.error('Failed to parse saved backtest session', e);
      }
    }
  }, [strategyName, syncEngineState]);

  // Load saved drawings for asset & timeframe from localStorage
  useEffect(() => {
    const key = `tz_backtest_drawings_${selectedAssetId}_${selectedTimeframe}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setDrawings(JSON.parse(saved));
      } catch (e) {
        setDrawings([]);
      }
    } else {
      setDrawings([]);
    }
  }, [selectedAssetId, selectedTimeframe]);

  // Persist drawings whenever they change
  const handleUpdateDrawings = (newDrawings: BacktestDrawing[]) => {
    setDrawings(newDrawings);
    const key = `tz_backtest_drawings_${selectedAssetId}_${selectedTimeframe}`;
    localStorage.setItem(key, JSON.stringify(newDrawings));
  };

  // Load 100% Real Historical Market Candles
  const loadMarketData = useCallback(async (customTargetDate?: Date, forceLive: boolean = false) => {
    setLoading(true);
    setLoadError(null);
    setIsPlaying(false);

    try {
      let targetTimeSec: number | undefined = undefined;

      if (forceLive) {
        updateReplayMode(false);
      } else if (customTargetDate) {
        targetTimeSec = Math.floor(customTargetDate.getTime() / 1000);
        updateReplayMode(true, targetTimeSec);
      } else if (isReplayModeRef.current && replayTargetTimeRef.current) {
        targetTimeSec = replayTargetTimeRef.current;
      }

      const res = await fetchRealHistoricalCandles(
        selectedAssetId,
        selectedTimeframe,
        targetTimeSec,
        1500
      );

      if (res.candles.length === 0) {
        setLoadError('No historical candles returned from market feed for this asset.');
      } else {
        setCandles(res.candles);
        setDataSource(res.source);

        if (targetTimeSec && isReplayModeRef.current) {
          // Replay Mode: snap to candle closest to historical replay target
          let closestIdx = 0;
          let minDiff = Infinity;
          for (let i = 0; i < res.candles.length; i++) {
            const diff = Math.abs(res.candles[i].time - targetTimeSec);
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = i;
            }
          }
          setCurrentIndex(closestIdx);
          engineRef.current.currentCandle = res.candles[closestIdx];
          // Keep target time locked to the exact matched candle time
          replayTargetTimeRef.current = res.candles[closestIdx].time;
        } else {
          // Live Mode: Always open the chart for current date & time (the latest candle)
          const latestIndex = Math.max(0, res.candles.length - 1);
          setCurrentIndex(latestIndex);
          engineRef.current.currentCandle = res.candles[latestIndex];
        }

        // Only clear open positions if asset changed
        if (engineRef.current.symbol !== selectedAssetId) {
          engineRef.current.openPosition = null;
          engineRef.current.pendingOrders = [];
        }

        engineRef.current.symbol = selectedAssetId;
        engineRef.current.timeframe = selectedTimeframe;
        engineRef.current.strategyName = strategyName;
        setPresetOrderParams(null);
        syncEngineState();
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to fetch authentic historical market data.');
    } finally {
      setLoading(false);
    }
  }, [selectedAssetId, selectedTimeframe, strategyName, syncEngineState, updateReplayMode]);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  // Bar Replay Auto-Playback Interval
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(80, 1000 / speed);
    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= candles.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const nextIdx = prev + 1;
        const newCandle = candles[nextIdx];
        if (newCandle) {
          if (isReplayModeRef.current) {
            replayTargetTimeRef.current = newCandle.time;
          }
          engineRef.current.processCandle(newCandle);
          syncEngineState();
        }
        return nextIdx;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, candles, syncEngineState]);

  // Step Forward
  const handleStepForward = useCallback(() => {
    if (currentIndex < candles.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const newCandle = candles[nextIdx];
      if (newCandle) {
        if (isReplayModeRef.current) {
          replayTargetTimeRef.current = newCandle.time;
        }
        engineRef.current.processCandle(newCandle);
        syncEngineState();
      }
    }
  }, [currentIndex, candles, syncEngineState]);

  // Step Backward
  const handleStepBack = useCallback(() => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevCandle = candles[prevIdx];
      if (prevCandle) {
        updateReplayMode(true, prevCandle.time);
        engineRef.current.currentCandle = prevCandle;
        syncEngineState();
      }
    }
  }, [currentIndex, candles, syncEngineState, updateReplayMode]);

  // Reset to start of dataset
  const handleResetReplay = useCallback(() => {
    setIsPlaying(false);
    const startIdx = Math.min(10, candles.length - 1);
    setCurrentIndex(startIdx);
    const candle = candles[startIdx];
    if (candle) {
      updateReplayMode(true, candle.time);
      engineRef.current.currentCandle = candle;
      syncEngineState();
    }
  }, [candles, syncEngineState, updateReplayMode]);

  // Scrubber Seek Handler
  const handleSeek = (index: number) => {
    setCurrentIndex(index);
    const candle = candles[index];
    if (candle) {
      if (index < candles.length - 1 || isReplayModeRef.current) {
        updateReplayMode(true, candle.time);
      }
      engineRef.current.currentCandle = candle;
      syncEngineState();
    }
  };

  // Cut Bar Handler
  const handleCutAtBar = (index: number) => {
    setIsCutMode(false);
    const cutCandle = candles[index];
    if (cutCandle) {
      updateReplayMode(true, cutCandle.time);
      engineRef.current.currentCandle = cutCandle;
    }
    setCurrentIndex(index);
    syncEngineState();
  };

  // Jump to specific historic date
  const handleJumpToDate = (targetDate: Date) => {
    const targetSec = Math.floor(targetDate.getTime() / 1000);
    updateReplayMode(true, targetSec);

    if (candles.length > 0 && targetSec >= candles[0].time && targetSec <= candles[candles.length - 1].time) {
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < candles.length; i++) {
        const diff = Math.abs(candles[i].time - targetSec);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      setCurrentIndex(closestIdx);
      if (candles[closestIdx]) {
        engineRef.current.currentCandle = candles[closestIdx];
        syncEngineState();
      }
    } else {
      loadMarketData(targetDate);
    }
  };

  // Exit Replay Mode & Return to Live Real-Time Market
  const handleExitReplay = () => {
    updateReplayMode(false);
    setIsPlaying(false);
    loadMarketData(undefined, true);
  };

  // Timeframe switch handler preserving historical replay position
  const handleSelectTimeframe = (newTf: string) => {
    if (newTf === selectedTimeframe) return;
    const candle = candles[currentIndex];
    if (candle && (isReplayModeRef.current || currentIndex < candles.length - 1)) {
      updateReplayMode(true, candle.time);
    }
    setSelectedTimeframe(newTf);
  };

  // Asset switch handler preserving historical replay position
  const handleSelectAsset = (newAssetId: string) => {
    if (newAssetId === selectedAssetId) return;
    const candle = candles[currentIndex];
    if (candle && (isReplayModeRef.current || currentIndex < candles.length - 1)) {
      updateReplayMode(true, candle.time);
    }
    setSelectedAssetId(newAssetId);
  };

  // Keyboard navigation for Space (play/pause), Left/Right arrow (step back/forward)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStepBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStepForward, handleStepBack]);

  // Order Placement Handler
  const handlePlaceOrder = (params: {
    type: OrderType;
    side: TradeSide;
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    riskAmount: number;
  }) => {
    if (!candles[currentIndex]) return;

    if (params.type === 'MARKET') {
      engineRef.current.enterMarketOrder(
        params.side,
        params.quantity,
        params.stopLoss,
        params.takeProfit,
        params.riskAmount
      );
    } else if (params.type === 'LIMIT' && params.price) {
      engineRef.current.placeLimitOrder(
        params.side,
        params.price,
        params.quantity,
        params.stopLoss,
        params.takeProfit,
        params.riskAmount
      );
    }
    syncEngineState();
  };

  // On-Chart Trade Modification Handlers (Item 7)
  const handleModifyPosition = (params: { stopLoss?: number; takeProfit?: number }) => {
    engineRef.current.updatePositionSlTp(params.stopLoss, params.takeProfit);
    syncEngineState();
  };

  const handleModifyLimitOrder = (orderId: string, price: number) => {
    engineRef.current.updateLimitOrderPrice(orderId, price);
    syncEngineState();
  };

  // Position Management Handlers
  const handleClosePosition = () => {
    engineRef.current.closePositionAtMarket();
    syncEngineState();
  };

  const handleMoveToBreakeven = () => {
    engineRef.current.moveStopLossToBreakEven();
    syncEngineState();
  };

  const handleCancelOrder = (id: string) => {
    engineRef.current.cancelOrder(id);
    syncEngineState();
  };

  const handleResetCapital = (amount: number) => {
    engineRef.current.resetSession(amount);
    syncEngineState();
  };

  const handleClearTrades = () => {
    engineRef.current.closedTrades = [];
    syncEngineState();
  };

  const handleDeleteTrade = (tradeId: string) => {
    engineRef.current.deleteTrade(tradeId);
    syncEngineState();
  };

  // Sync position tool with order panel
  const handleApplyPositionToOrder = (entry: number, sl: number, tp: number, side: TradeSide) => {
    setPresetOrderParams({ entry, sl, tp, side });
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!studioContainerRef.current) return;
    if (!document.fullscreenElement) {
      studioContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Sync state if user exits fullscreen via Esc key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Current bar formatted timestamp
  const currentCandle = candles[currentIndex] || null;
  const currentBarTimeFormatted = currentCandle
    ? new Date(currentCandle.time * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : undefined;

  return (
    <div
      ref={studioContainerRef}
      className={`flex flex-col bg-background text-foreground transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 p-3 h-screen w-screen overflow-hidden justify-between space-y-3'
          : 'space-y-4 min-h-screen'
      }`}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Top Header & Strategy Controls */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-card border border-border/40 dark:border-white/[0.08] shadow-xl ${
        isFullscreen ? 'shrink-0 p-3' : ''
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Strategy Title & Selector */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={strategyName}
                  onChange={e => setStrategyName(e.target.value)}
                  className="text-base font-black text-foreground bg-transparent border-b border-dashed border-border/40 hover:border-primary focus:border-primary focus:outline-none transition-colors"
                  title="Click to rename strategy"
                />
              </div>
              <div className="text-[10px] text-muted">TradeZella Backtesting Studio</div>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-border/40 dark:bg-white/[0.08] mx-1" />

          {/* Asset Selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedAssetId}
              onChange={e => handleSelectAsset(e.target.value)}
              className="px-3 py-1.5 bg-surface rounded-xl border border-border/40 dark:border-white/[0.08] text-foreground text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              {SUPPORTED_ASSETS.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-surface p-1 rounded-xl border border-border/40 dark:border-white/[0.08]">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                type="button"
                onClick={() => handleSelectTimeframe(tf.value)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedTimeframe === tf.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Replay Active Badge */}
          {isReplayMode && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>REPLAY ACTIVE</span>
            </div>
          )}

          {/* Data Source Badge */}
          {dataSource && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>{dataSource}</span>
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            type="button"
            onClick={() => loadMarketData()}
            title="Reload Real Market Historical Data"
            className="p-2 rounded-xl text-muted hover:text-foreground bg-surface hover:bg-surface-elevated border border-border/40 dark:border-white/[0.08] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2 rounded-xl text-muted hover:text-foreground bg-surface hover:bg-surface-elevated border border-border/40 dark:border-white/[0.08] transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Workspace (Chart + Drawing Toolbar + Order Panel) */}
      <div className={`grid gap-4 items-start ${
        isFullscreen
          ? 'grid-cols-1 flex-1 h-[calc(100vh-120px)] min-h-0'
          : 'grid-cols-1 lg:grid-cols-4'
      }`}>
        {/* Chart Column (Takes full width in fullscreen, 3 cols otherwise) */}
        <div className={`${isFullscreen ? 'col-span-1 h-full' : 'lg:col-span-3'} flex flex-col space-y-3`}>
          {loading ? (
            <div className={`w-full rounded-2xl border border-border/40 dark:border-white/[0.08] bg-surface flex flex-col items-center justify-center space-y-3 ${
              isFullscreen ? 'flex-1 h-full' : 'h-[540px]'
            }`}>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-sm font-bold text-foreground">
                Fetching Real Market Historical Candles...
              </div>
              <p className="text-xs text-muted max-w-sm text-center">
                Querying live exchange feeds for {selectedAssetId} ({selectedTimeframe}) over 1+ year of authentic market history.
              </p>
            </div>
          ) : loadError ? (
            <div className={`w-full rounded-2xl border border-rose-500/30 bg-surface flex flex-col items-center justify-center space-y-3 p-6 text-center ${
              isFullscreen ? 'flex-1 h-full' : 'h-[540px]'
            }`}>
              <div className="text-rose-400 font-bold text-base">Historical Data Fetch Error</div>
              <p className="text-xs text-muted max-w-md">{loadError}</p>
              <button
                type="button"
                onClick={() => loadMarketData()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl"
              >
                Retry Real Market Fetch
              </button>
            </div>
          ) : (
            <div className={`relative w-full ${isFullscreen ? 'flex-1 h-[calc(100%-65px)] min-h-[480px]' : 'h-[540px]'}`}>
              {/* Drawing Toolbar Overlay on Left with Hide Option (Items 2 & 5) */}
              <div className="absolute top-3 left-3 z-20">
                {isToolbarVisible ? (
                  <DrawingToolbar
                    activeTool={activeTool}
                    onSelectTool={tool => {
                      setActiveTool(tool);
                      if (tool !== 'cursor') {
                        setSelectedDrawingId(null);
                      }
                    }}
                    onDeleteSelected={() => {
                      if (selectedDrawingId) {
                        handleUpdateDrawings(drawings.filter(d => d.id !== selectedDrawingId));
                        setSelectedDrawingId(null);
                      }
                    }}
                    onClearAll={() => {
                      handleUpdateDrawings([]);
                      setSelectedDrawingId(null);
                    }}
                    canDelete={!!selectedDrawingId}
                    drawingCount={drawings.length}
                    onHide={() => setIsToolbarVisible(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsToolbarVisible(true)}
                    title="Show Drawing Tools"
                    className="p-2 rounded-xl bg-surface-card/90 backdrop-blur-md border border-border/40 dark:border-white/[0.08] text-muted hover:text-foreground shadow-lg flex items-center gap-1.5 text-xs font-semibold hover:border-primary/40 transition-all"
                  >
                    <PenTool className="w-4 h-4 text-primary" />
                    <span>Tools</span>
                  </button>
                )}
              </div>

              {/* Chart with Candles, Draggable Price Lines, and SVG Drawing Overlay */}
              <BacktestChart
                candles={candles}
                currentIndex={currentIndex}
                openPosition={engineState.openPosition}
                pendingOrders={engineState.pendingOrders}
                activeTool={activeTool}
                onToolUsed={() => setActiveTool('cursor')}
                drawings={drawings}
                onUpdateDrawings={handleUpdateDrawings}
                selectedDrawingId={selectedDrawingId}
                onSelectDrawing={setSelectedDrawingId}
                isCutMode={isCutMode}
                onCutAtBar={handleCutAtBar}
                onCancelCutMode={() => setIsCutMode(false)}
                onApplyPositionToOrder={handleApplyPositionToOrder}
                onModifyPosition={handleModifyPosition}
                onModifyLimitOrder={handleModifyLimitOrder}
              />
            </div>
          )}

          {/* Floating Replay Controls Bar */}
          {!loading && candles.length > 0 && (
            <div className="shrink-0">
              <ReplayControls
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onStepForward={handleStepForward}
                onStepBack={handleStepBack}
                onReset={handleResetReplay}
                speed={speed}
                onChangeSpeed={setSpeed}
                currentIndex={currentIndex}
                totalCandles={candles.length}
                onSeek={handleSeek}
                isCutMode={isCutMode}
                onToggleCutMode={() => setIsCutMode(!isCutMode)}
                currentBarTimeFormatted={currentBarTimeFormatted}
                onJumpToDate={handleJumpToDate}
                isReplayMode={isReplayMode}
                onExitReplay={handleExitReplay}
              />
            </div>
          )}
        </div>

        {/* Order Execution & Sizing Panel Column (1 col) - Hidden in Fullscreen (Item 3 & Image 2) */}
        {!isFullscreen && (
          <div className="lg:col-span-1 h-full">
            <BacktestOrderPanel
              currentCandle={currentCandle}
              virtualBalance={engineState.virtualBalance}
              virtualEquity={engineState.virtualEquity}
              openPosition={engineState.openPosition}
              pendingOrders={engineState.pendingOrders}
              onPlaceOrder={handlePlaceOrder}
              onClosePosition={handleClosePosition}
              onMoveToBreakeven={handleMoveToBreakeven}
              onCancelOrder={handleCancelOrder}
              onResetCapital={handleResetCapital}
              symbol={selectedAssetId}
              presetOrderParams={presetOrderParams}
            />
          </div>
        )}
      </div>

      {/* Bottom Session Trade Log & Analytics - Hidden in Fullscreen (Item 3 & Image 3) */}
      {!isFullscreen && (
        <div className="w-full pt-2">
          <BacktestTradeLog
            trades={engineState.closedTrades}
            stats={engineState.stats}
            openPosition={engineState.openPosition}
            onClosePosition={handleClosePosition}
            onMoveToBreakeven={handleMoveToBreakeven}
            onClearTrades={handleClearTrades}
            onDeleteTrade={handleDeleteTrade}
          />
        </div>
      )}
    </div>
  );
};
