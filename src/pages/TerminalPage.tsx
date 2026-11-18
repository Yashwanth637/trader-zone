import React, { useEffect, useRef, useState, useCallback } from 'react';
import { KLineChartPro, SymbolInfo, Period } from '@simahfud/klinecharts-pro';
import '@simahfud/klinecharts-pro/dist/klinecharts-pro.css';
import { binanceDatafeed } from '../lib/binanceDatafeed';
import { RotateCcw, RotateCw, LayoutGrid, X, Check } from 'lucide-react';

const STORAGE_KEY = 'traderzone_terminal_saved_state';

export type LayoutMode = '1x1' | '1x2' | '2x1' | '1+2' | '2x2';

interface ChartPaneConfig {
  id: string;
  defaultSymbol: SymbolInfo;
  defaultPeriod: Period;
}

const DEFAULT_PERIODS: Period[] = [
  { multiplier: 1, timespan: 'minute', text: '1m' },
  { multiplier: 5, timespan: 'minute', text: '5m' },
  { multiplier: 15, timespan: 'minute', text: '15m' },
  { multiplier: 1, timespan: 'hour', text: '1h' },
  { multiplier: 4, timespan: 'hour', text: '4h' },
  { multiplier: 1, timespan: 'day', text: '1D' },
  { multiplier: 1, timespan: 'week', text: '1W' }
];

const PRESET_SYMBOLS: Record<string, SymbolInfo> = {
  BTCUSDT: {
    ticker: 'BTCUSDT',
    name: 'BTC/USDT',
    shortName: 'BTC',
    pricePrecision: 2,
    volumePrecision: 4,
    exchange: 'Binance',
    market: 'crypto',
    priceCurrency: 'USDT',
    type: 'crypto'
  },
  ETHUSDT: {
    ticker: 'ETHUSDT',
    name: 'ETH/USDT',
    shortName: 'ETH',
    pricePrecision: 2,
    volumePrecision: 4,
    exchange: 'Binance',
    market: 'crypto',
    priceCurrency: 'USDT',
    type: 'crypto'
  },
  SOLUSDT: {
    ticker: 'SOLUSDT',
    name: 'SOL/USDT',
    shortName: 'SOL',
    pricePrecision: 2,
    volumePrecision: 3,
    exchange: 'Binance',
    market: 'crypto',
    priceCurrency: 'USDT',
    type: 'crypto'
  },
  BNBUSDT: {
    ticker: 'BNBUSDT',
    name: 'BNB/USDT',
    shortName: 'BNB',
    pricePrecision: 2,
    volumePrecision: 3,
    exchange: 'Binance',
    market: 'crypto',
    priceCurrency: 'USDT',
    type: 'crypto'
  }
};

interface SingleChartProps {
  paneId: string;
  initialSymbol: SymbolInfo;
  initialPeriod: Period;
  onLayoutClick: () => void;
  onDrawingsUpdate?: (drawings: any[]) => void;
  onSaveState?: (symbol: SymbolInfo, period: Period) => void;
  externalDrawingsTrigger?: number;
  chartRefCallback?: (chart: KLineChartPro | null) => void;
}

const SingleChartPane: React.FC<SingleChartProps> = ({
  paneId,
  initialSymbol,
  initialPeriod,
  onLayoutClick,
  onDrawingsUpdate,
  onSaveState,
  chartRefCallback
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<KLineChartPro | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let resizeObserver: ResizeObserver | null = null;
    let chart: KLineChartPro | null = null;

    try {
      chart = new KLineChartPro({
        container: containerRef.current,
        theme: 'dark',
        locale: 'en-US',
        timezone: 'Asia/Kolkata', // Set UTC+5:30 as default timezone
        symbol: initialSymbol,
        period: initialPeriod,
        periods: DEFAULT_PERIODS,
        datafeed: binanceDatafeed,
        chartType: 'candle_solid',
        mainIndicators: [],
        subIndicators: [],
        persistence: {
          enabled: true
        },
        drawingBarVisible: true,
        watermark: '',
        onLayoutClick: () => {
          onLayoutClick();
        },
        onDrawingsChange: (_ticker, drawings) => {
          if (onDrawingsUpdate) {
            onDrawingsUpdate(drawings);
          }
        },
        onSettingsChange: () => {
          if (chart && onSaveState) {
            onSaveState(chart.getSymbol(), chart.getPeriod());
          }
        }
      });

      chartInstanceRef.current = chart;
      if (chartRefCallback) {
        chartRefCallback(chart);
      }

      const triggerResize = () => {
        try {
          const widget = chart?.getWidget?.();
          if (widget) {
            widget.resize();
          }
          window.dispatchEvent(new Event('resize'));
        } catch (_) {}
      };

      // Lifecycle resize triggers
      requestAnimationFrame(() => triggerResize());
      setTimeout(triggerResize, 60);
      setTimeout(triggerResize, 180);
      setTimeout(triggerResize, 450);
      setTimeout(triggerResize, 900);
      setTimeout(triggerResize, 1500);

      if (chart.ready) {
        chart.ready().then(() => {
          setTimeout(triggerResize, 100);
          setTimeout(triggerResize, 350);
        });
      }

      // Responsive observer
      resizeObserver = new ResizeObserver(() => {
        triggerResize();
      });
      resizeObserver.observe(containerRef.current);
    } catch (err) {
      console.error(`[TerminalPage] Error initializing chart ${paneId}:`, err);
    }

    // Attach Price Scale Wheel Zoom & Reset Double Click Handler
    const containerEl = containerRef.current;
    const handleWheel = (e: WheelEvent) => {
      if (!containerEl || !chartInstanceRef.current) return;
      const rect = containerEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      // If cursor is on the price axis area (rightmost 75px)
      if (mouseX >= rect.width - 75) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const widget = chartInstanceRef.current.getWidget?.();
          const candlePane = widget?.getDrawPaneById?.('candle_pane');
          const yAxis = candlePane?.getAxisComponent?.();
          if (yAxis) {
            const range = yAxis.getRange();
            if (range && range.range > 0) {
              const delta = e.deltaY > 0 ? 1.08 : 0.92;
              const mid = (range.from + range.to) / 2;
              const newHalf = (range.range * delta) / 2;
              const newFrom = mid - newHalf;
              const newTo = mid + newHalf;
              yAxis.setRange({
                from: newFrom,
                to: newTo,
                range: newHalf * 2,
                realFrom: yAxis.convertToRealValue(newFrom),
                realTo: yAxis.convertToRealValue(newTo),
                realRange: yAxis.convertToRealValue(newTo) - yAxis.convertToRealValue(newFrom)
              });
              widget.adjustPaneViewport(false, true, true, true);
            }
          }
        } catch (_) {}
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      if (!containerEl || !chartInstanceRef.current) return;
      const rect = containerEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      if (mouseX >= rect.width - 75) {
        try {
          const widget = chartInstanceRef.current.getWidget?.();
          const candlePane = widget?.getDrawPaneById?.('candle_pane');
          const yAxis = candlePane?.getAxisComponent?.();
          if (yAxis) {
            yAxis.setAutoCalcTickFlag(true);
            widget.adjustPaneViewport(false, true, true, true);
          }
        } catch (_) {}
      }
    };

    containerEl.addEventListener('wheel', handleWheel, { passive: false });
    containerEl.addEventListener('dblclick', handleDblClick);

    // Periodic state save for symbol and timeframe changes
    const stateInterval = setInterval(() => {
      if (chart && onSaveState) {
        try {
          const curSym = chart.getSymbol();
          const curPer = chart.getPeriod();
          if (curSym && curSym.ticker && curPer) {
            onSaveState(curSym, curPer);
          }
        } catch (_) {}
      }
    }, 2500);

    return () => {
      clearInterval(stateInterval);
      if (resizeObserver) resizeObserver.disconnect();
      if (containerEl) {
        containerEl.removeEventListener('wheel', handleWheel);
        containerEl.removeEventListener('dblclick', handleDblClick);
      }
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy?.();
        } catch (_) {}
        chartInstanceRef.current = null;
      }
      if (chartRefCallback) {
        chartRefCallback(null);
      }
    };
  }, [paneId]);

  return (
    <div
      ref={containerRef}
      id={`klinecharts-pro-container-${paneId}`}
      className="terminal-chart-pane w-full h-full relative"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        backgroundColor: '#151517'
      }}
    />
  );
};

export const TerminalPage: React.FC = () => {
  // Restore persisted state or load default
  const savedState = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  })();

  const [layout, setLayout] = useState<LayoutMode>(savedState?.layout || '1x1');
  const [showLayoutModal, setShowLayoutModal] = useState<boolean>(false);

  // Stored symbol & timeframe for primary chart
  const primarySymbol: SymbolInfo = savedState?.symbol || PRESET_SYMBOLS.BTCUSDT;
  const primaryPeriod: Period = savedState?.period || { multiplier: 1, timespan: 'hour', text: '1h' };

  // Track active chart instances for drawings and undo/redo
  const primaryChartRef = useRef<KLineChartPro | null>(null);

  // Undo / Redo Stacks for Drawings
  const undoStackRef = useRef<any[][]>([]);
  const redoStackRef = useRef<any[][]>([]);
  const isUndoRedoActionRef = useRef<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const handleDrawingsUpdate = useCallback((drawings: any[]) => {
    if (isUndoRedoActionRef.current) return;
    undoStackRef.current.push(drawings);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleUndo = useCallback(() => {
    const chart = primaryChartRef.current;
    if (!chart || undoStackRef.current.length === 0) return;

    isUndoRedoActionRef.current = true;
    const currentState = chart.getDrawings?.(chart.getSymbol().ticker) ?? [];
    redoStackRef.current.push(currentState);

    const previousState = undoStackRef.current.pop() ?? [];
    chart.setDrawings?.(chart.getSymbol().ticker, previousState);

    updateUndoRedoState();
    setTimeout(() => {
      isUndoRedoActionRef.current = false;
    }, 100);
  }, [updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    const chart = primaryChartRef.current;
    if (!chart || redoStackRef.current.length === 0) return;

    isUndoRedoActionRef.current = true;
    const currentState = chart.getDrawings?.(chart.getSymbol().ticker) ?? [];
    undoStackRef.current.push(currentState);

    const nextState = redoStackRef.current.pop() ?? [];
    chart.setDrawings?.(chart.getSymbol().ticker, nextState);

    updateUndoRedoState();
    setTimeout(() => {
      isUndoRedoActionRef.current = false;
    }, 100);
  }, [updateUndoRedoState]);

  // Global Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTargetInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      if (isTargetInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (modKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Persist symbol & timeframe
  const handleSaveState = useCallback((symbol: SymbolInfo, period: Period) => {
    try {
      const prev = (() => {
        try {
          const r = localStorage.getItem(STORAGE_KEY);
          return r ? JSON.parse(r) : {};
        } catch (_) {
          return {};
        }
      })();

      const updated = {
        ...prev,
        symbol,
        period,
        layout,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }, [layout]);

  const handleSelectLayout = (newLayout: LayoutMode) => {
    setLayout(newLayout);
    setShowLayoutModal(false);
    try {
      const prev = (() => {
        try {
          const r = localStorage.getItem(STORAGE_KEY);
          return r ? JSON.parse(r) : {};
        } catch (_) {
          return {};
        }
      })();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, layout: newLayout }));
    } catch (_) {}

    // Dispatch resize events across animation frames so all panes fit screen exactly
    setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 400);
  };

  return (
    <div
      className="w-full h-full flex flex-col flex-1 min-h-0 bg-[#151517] relative overflow-hidden"
      style={{
        width: '100%',
        height: 'calc(100vh - 4rem)',
        maxHeight: 'calc(100vh - 4rem)',
        backgroundColor: '#151517'
      }}
    >
      {/* Multi-Chart Grid Renderers */}
      {layout === '1x1' && (
        <div
          className="grid grid-cols-1 grid-rows-1 flex-1 h-full w-full min-h-0 overflow-hidden bg-[#151517]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: '1fr' }}
        >
          <SingleChartPane
            paneId="main-1"
            initialSymbol={primarySymbol}
            initialPeriod={primaryPeriod}
            onLayoutClick={() => setShowLayoutModal(true)}
            onDrawingsUpdate={handleDrawingsUpdate}
            onSaveState={handleSaveState}
            chartRefCallback={(inst) => {
              primaryChartRef.current = inst;
            }}
          />
        </div>
      )}

      {layout === '1x2' && (
        <div
          className="grid grid-cols-2 grid-rows-1 flex-1 h-full w-full min-h-0 overflow-hidden gap-[2px] bg-[#22242a]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: '1fr' }}
        >
          <SingleChartPane
            paneId="split-h-1"
            initialSymbol={primarySymbol}
            initialPeriod={primaryPeriod}
            onLayoutClick={() => setShowLayoutModal(true)}
            onDrawingsUpdate={handleDrawingsUpdate}
            onSaveState={handleSaveState}
            chartRefCallback={(inst) => {
              primaryChartRef.current = inst;
            }}
          />
          <SingleChartPane
            paneId="split-h-2"
            initialSymbol={PRESET_SYMBOLS.ETHUSDT}
            initialPeriod={{ multiplier: 15, timespan: 'minute', text: '15m' }}
            onLayoutClick={() => setShowLayoutModal(true)}
          />
        </div>
      )}

      {layout === '2x1' && (
        <div
          className="grid grid-cols-1 grid-rows-2 flex-1 h-full w-full min-h-0 overflow-hidden gap-[2px] bg-[#22242a]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}
        >
          <SingleChartPane
            paneId="split-v-1"
            initialSymbol={primarySymbol}
            initialPeriod={primaryPeriod}
            onLayoutClick={() => setShowLayoutModal(true)}
            onDrawingsUpdate={handleDrawingsUpdate}
            onSaveState={handleSaveState}
            chartRefCallback={(inst) => {
              primaryChartRef.current = inst;
            }}
          />
          <SingleChartPane
            paneId="split-v-2"
            initialSymbol={PRESET_SYMBOLS.ETHUSDT}
            initialPeriod={{ multiplier: 15, timespan: 'minute', text: '15m' }}
            onLayoutClick={() => setShowLayoutModal(true)}
          />
        </div>
      )}

      {layout === '1+2' && (
        <div
          className="grid grid-cols-2 grid-rows-1 flex-1 h-full w-full min-h-0 overflow-hidden gap-[2px] bg-[#22242a]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: '1fr' }}
        >
          <div className="h-full w-full min-h-0 overflow-hidden flex flex-col flex-1">
            <SingleChartPane
              paneId="split-t-1"
              initialSymbol={primarySymbol}
              initialPeriod={primaryPeriod}
              onLayoutClick={() => setShowLayoutModal(true)}
              onDrawingsUpdate={handleDrawingsUpdate}
              onSaveState={handleSaveState}
              chartRefCallback={(inst) => {
                primaryChartRef.current = inst;
              }}
            />
          </div>
          <div
            className="grid grid-cols-1 grid-rows-2 h-full w-full min-h-0 overflow-hidden gap-[2px] bg-[#22242a]"
            style={{ height: '100%', gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}
          >
            <SingleChartPane
              paneId="split-t-2"
              initialSymbol={PRESET_SYMBOLS.ETHUSDT}
              initialPeriod={{ multiplier: 15, timespan: 'minute', text: '15m' }}
              onLayoutClick={() => setShowLayoutModal(true)}
            />
            <SingleChartPane
              paneId="split-t-3"
              initialSymbol={PRESET_SYMBOLS.SOLUSDT}
              initialPeriod={{ multiplier: 1, timespan: 'hour', text: '1h' }}
              onLayoutClick={() => setShowLayoutModal(true)}
            />
          </div>
        </div>
      )}

      {layout === '2x2' && (
        <div
          className="grid grid-cols-2 grid-rows-2 flex-1 h-full w-full min-h-0 overflow-hidden gap-[2px] bg-[#22242a]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}
        >
          <SingleChartPane
            paneId="grid-4-1"
            initialSymbol={primarySymbol}
            initialPeriod={primaryPeriod}
            onLayoutClick={() => setShowLayoutModal(true)}
            onDrawingsUpdate={handleDrawingsUpdate}
            onSaveState={handleSaveState}
            chartRefCallback={(inst) => {
              primaryChartRef.current = inst;
            }}
          />
          <SingleChartPane
            paneId="grid-4-2"
            initialSymbol={PRESET_SYMBOLS.ETHUSDT}
            initialPeriod={{ multiplier: 15, timespan: 'minute', text: '15m' }}
            onLayoutClick={() => setShowLayoutModal(true)}
          />
          <SingleChartPane
            paneId="grid-4-3"
            initialSymbol={PRESET_SYMBOLS.SOLUSDT}
            initialPeriod={{ multiplier: 1, timespan: 'hour', text: '1h' }}
            onLayoutClick={() => setShowLayoutModal(true)}
          />
          <SingleChartPane
            paneId="grid-4-4"
            initialSymbol={PRESET_SYMBOLS.BNBUSDT}
            initialPeriod={{ multiplier: 4, timespan: 'hour', text: '4h' }}
            onLayoutClick={() => setShowLayoutModal(true)}
          />
        </div>
      )}

      {/* TradingView-Style Layout Selection Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1c1c20] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-md w-full text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-blue-400" />
                  Select Chart Layout
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Choose a multi-chart view to monitor multiple currency pairs simultaneously.
                </p>
              </div>
              <button
                onClick={() => setShowLayoutModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Single Chart */}
              <button
                onClick={() => handleSelectLayout('1x1')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  layout === '1x1'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/20'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="w-20 h-14 rounded-md border border-white/30 bg-white/10 flex items-center justify-center">
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">Single Chart</span>
                  {layout === '1x1' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
              </button>

              {/* Option 2: 2 Charts Side-by-Side */}
              <button
                onClick={() => handleSelectLayout('1x2')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  layout === '1x2'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/20'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="w-20 h-14 rounded-md border border-white/30 bg-white/10 grid grid-cols-2 gap-1 p-1">
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">2 Side-by-Side</span>
                  {layout === '1x2' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
              </button>

              {/* Option 3: 2 Charts Stacked */}
              <button
                onClick={() => handleSelectLayout('2x1')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  layout === '2x1'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/20'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="w-20 h-14 rounded-md border border-white/30 bg-white/10 grid grid-rows-2 gap-1 p-1">
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">2 Stacked</span>
                  {layout === '2x1' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
              </button>

              {/* Option 4: 3 Charts (1 Left, 2 Right) */}
              <button
                onClick={() => handleSelectLayout('1+2')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  layout === '1+2'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/20'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="w-20 h-14 rounded-md border border-white/30 bg-white/10 grid grid-cols-2 gap-1 p-1">
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                  <div className="grid grid-rows-2 gap-1">
                    <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                    <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">3 Split</span>
                  {layout === '1+2' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
              </button>

              {/* Option 5: 4 Charts Grid */}
              <button
                onClick={() => handleSelectLayout('2x2')}
                className={`col-span-2 flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  layout === '2x2'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/20'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="w-24 h-14 rounded-md border border-white/30 bg-white/10 grid grid-cols-2 grid-rows-2 gap-1 p-1">
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                  <div className="w-full h-full bg-blue-400/30 rounded-sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">4 Charts (2x2 Grid)</span>
                  {layout === '2x2' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TerminalPage;
