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
  ChevronDown,
  Sparkles,
  CheckCircle2
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

  // Drawings State
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
    setEngineState({
      virtualBalance: engineRef.current.balance,
      virtualEquity: engineRef.current.equity,
      openPosition: engineRef.current.openPosition,
      pendingOrders: [...engineRef.current.pendingOrders],
      closedTrades: [...engineRef.current.closedTrades],
      stats: engineRef.current.getStats()
    });
  }, []);

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
  const loadMarketData = useCallback(async (customStartDate?: Date) => {
    setLoading(true);
    setLoadError(null);
    setIsPlaying(false);

    try {
      const res = await fetchRealHistoricalCandles(selectedAssetId, selectedTimeframe, customStartDate, 1500);
      if (res.candles.length === 0) {
        setLoadError('No historical candles returned from market feed for this asset.');
      } else {
        setCandles(res.candles);
        setDataSource(res.source);

        // Start replay around 300 bars from the end (or 20% into the dataset)
        const startIndex = Math.max(10, Math.min(300, res.candles.length - 100));
        setCurrentIndex(startIndex);

        // Feed candles up to start index into engine
        engineRef.current.symbol = selectedAssetId;
        engineRef.current.timeframe = selectedTimeframe;
        engineRef.current.strategyName = strategyName;
        engineRef.current.currentCandle = res.candles[startIndex];
        syncEngineState();
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to fetch authentic historical market data.');
    } finally {
      setLoading(false);
    }
  }, [selectedAssetId, selectedTimeframe, strategyName, syncEngineState]);

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
          engineRef.current.processCandle(newCandle);
          syncEngineState();
        }
        return nextIdx;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, candles, syncEngineState]);

  // Step Forward
  const handleStepForward = () => {
    if (currentIndex < candles.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const newCandle = candles[nextIdx];
      if (newCandle) {
        engineRef.current.processCandle(newCandle);
        syncEngineState();
      }
    }
  };

  // Step Backward
  const handleStepBack = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      if (candles[prevIdx]) {
        engineRef.current.currentCandle = candles[prevIdx];
      }
    }
  };

  // Reset to start of dataset
  const handleResetReplay = () => {
    setIsPlaying(false);
    const startIdx = Math.min(10, candles.length - 1);
    setCurrentIndex(startIdx);
    if (candles[startIdx]) {
      engineRef.current.currentCandle = candles[startIdx];
    }
  };

  // Cut Bar Handler
  const handleCutAtBar = (index: number) => {
    setIsCutMode(false);
    setCurrentIndex(index);
    if (candles[index]) {
      engineRef.current.currentCandle = candles[index];
      syncEngineState();
    }
  };

  // Jump to specific historic date
  const handleJumpToDate = (targetDate: Date) => {
    loadMarketData(targetDate);
  };

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
      className={`flex flex-col space-y-4 bg-background min-h-screen text-slate-100 ${
        isFullscreen ? 'p-6 fixed inset-0 z-50 overflow-y-auto bg-slate-950' : ''
      }`}
    >
      {/* Top Header & Strategy Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-card border border-border/80 shadow-xl">
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
                  className="text-base font-black text-white bg-transparent border-b border-dashed border-border hover:border-primary focus:border-primary focus:outline-none transition-colors"
                  title="Click to rename strategy"
                />
              </div>
              <div className="text-[10px] text-slate-400">TradeZella Backtesting Studio</div>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-border mx-1" />

          {/* Asset Selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedAssetId}
              onChange={e => setSelectedAssetId(e.target.value)}
              className="px-3 py-1.5 bg-surface rounded-xl border border-border text-white text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              {SUPPORTED_ASSETS.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-surface p-1 rounded-xl border border-border">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                type="button"
                onClick={() => setSelectedTimeframe(tf.value)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedTimeframe === tf.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Data Source Badge */}
          {dataSource && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
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
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-surface hover:bg-surface-elevated border border-border transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-surface hover:bg-surface-elevated border border-border transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Workspace (Chart + Drawing Toolbar + Order Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Chart Column (3 cols on large screens) */}
        <div className="lg:col-span-3 flex flex-col space-y-3">
          {loading ? (
            <div className="w-full h-[540px] rounded-2xl border border-border/80 bg-surface flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-sm font-bold text-white">
                Fetching Real Market Historical Candles...
              </div>
              <p className="text-xs text-slate-400 max-w-sm text-center">
                Querying live exchange feeds for {selectedAssetId} ({selectedTimeframe}) over 1+ year of authentic market history.
              </p>
            </div>
          ) : loadError ? (
            <div className="w-full h-[540px] rounded-2xl border border-rose-500/30 bg-surface flex flex-col items-center justify-center space-y-3 p-6 text-center">
              <div className="text-rose-400 font-bold text-base">Historical Data Fetch Error</div>
              <p className="text-xs text-slate-400 max-w-md">{loadError}</p>
              <button
                type="button"
                onClick={() => loadMarketData()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl"
              >
                Retry Real Market Fetch
              </button>
            </div>
          ) : (
            <div className="relative w-full h-[540px]">
              {/* Drawing Toolbar Overlay on Left */}
              <div className="absolute top-4 left-4 z-30">
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
                />
              </div>

              {/* Chart with Candles, Price Lines, and SVG Drawing Overlay */}
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
                onApplyPositionToOrder={handleApplyPositionToOrder}
              />
            </div>
          )}

          {/* Floating Replay Controls Bar */}
          {!loading && candles.length > 0 && (
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
              onSeek={idx => {
                setCurrentIndex(idx);
                if (candles[idx]) {
                  engineRef.current.currentCandle = candles[idx];
                  syncEngineState();
                }
              }}
              isCutMode={isCutMode}
              onToggleCutMode={() => setIsCutMode(!isCutMode)}
              currentBarTimeFormatted={currentBarTimeFormatted}
              onJumpToDate={handleJumpToDate}
            />
          )}
        </div>

        {/* Order Execution & Sizing Panel Column (1 col) */}
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
      </div>

      {/* Bottom Session Trade Log & Analytics (100% Isolated) */}
      <div className="w-full pt-2">
        <BacktestTradeLog
          trades={engineState.closedTrades}
          stats={engineState.stats}
          onClearTrades={handleClearTrades}
        />
      </div>
    </div>
  );
};
