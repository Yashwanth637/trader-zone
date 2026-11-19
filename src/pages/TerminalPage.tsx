import React, { useEffect, useRef, useState, useCallback } from 'react';
import { KLineChartPro, SymbolInfo, Period } from '@simahfud/klinecharts-pro';
import '@simahfud/klinecharts-pro/dist/klinecharts-pro.css';
import { binanceDatafeed } from '../lib/binanceDatafeed';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutGrid,
  X,
  Check,
  Settings,
  Palette,
  Sun,
  Moon,
  Sliders,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Eye
} from 'lucide-react';

const STORAGE_KEY = 'traderzone_terminal_saved_state';
const CANDLE_STYLES_KEY = 'traderzone_chart_candle_styles';

export type LayoutMode = '1x1' | '1x2' | '2x1' | '1+2' | '2x2';

export interface ChartCandleStyles {
  upColor: string;
  downColor: string;
  upBorderColor: string;
  downBorderColor: string;
  upWickColor: string;
  downWickColor: string;
  priceAxisType: 'normal' | 'percentage' | 'log';
  candleType: 'candle_solid' | 'candle_stroke' | 'ohlc' | 'area';
  showLastPrice: boolean;
  showHighLow: boolean;
}

export const DEFAULT_CANDLE_STYLES: ChartCandleStyles = {
  upColor: '#089981',
  downColor: '#f23645',
  upBorderColor: '#089981',
  downBorderColor: '#f23645',
  upWickColor: '#089981',
  downWickColor: '#f23645',
  priceAxisType: 'normal',
  candleType: 'candle_solid',
  showLastPrice: true,
  showHighLow: false
};

export const COLOR_PRESETS = [
  {
    name: 'TradingView Classic',
    up: '#089981',
    down: '#f23645'
  },
  {
    name: 'Emerald & Crimson',
    up: '#10b981',
    down: '#ef4444'
  },
  {
    name: 'Cyberpunk Neon',
    up: '#00f0ff',
    down: '#ff007a'
  },
  {
    name: 'Mint & Coral',
    up: '#26a69a',
    down: '#f43f5e'
  },
  {
    name: 'Monochrome Slate',
    up: '#cbd5e1',
    down: '#475569'
  }
];

export const getStoredCandleStyles = (): ChartCandleStyles => {
  try {
    const raw = localStorage.getItem(CANDLE_STYLES_KEY);
    if (raw) {
      return { ...DEFAULT_CANDLE_STYLES, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return DEFAULT_CANDLE_STYLES;
};

export const applyCandleStylesToChart = (chart: KLineChartPro, styles: ChartCandleStyles, isDark: boolean = true) => {
  try {
    chart.setStyles({
      grid: {
        horizontal: {
          color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)'
        },
        vertical: {
          color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)'
        }
      },
      xAxis: {
        axisLine: {
          color: isDark ? '#2a2e39' : '#e0e3eb'
        },
        tickText: {
          color: isDark ? '#cbd5e1' : '#0f172a',
          size: 12
        },
        tickLine: {
          color: isDark ? '#2a2e39' : '#e0e3eb'
        }
      },
      yAxis: {
        type: styles.priceAxisType as any,
        axisLine: {
          color: isDark ? '#2a2e39' : '#e0e3eb'
        },
        tickText: {
          color: isDark ? '#cbd5e1' : '#0f172a',
          size: 12
        },
        tickLine: {
          color: isDark ? '#2a2e39' : '#e0e3eb'
        }
      },
      separator: {
        color: isDark ? '#2a2e39' : '#e0e3eb'
      },
      crosshair: {
        horizontal: {
          line: {
            color: isDark ? '#787b86' : '#9598a1'
          },
          text: {
            color: '#ffffff',
            borderColor: isDark ? '#363a45' : '#131722',
            backgroundColor: isDark ? '#363a45' : '#131722'
          }
        },
        vertical: {
          line: {
            color: isDark ? '#787b86' : '#9598a1'
          },
          text: {
            color: '#ffffff',
            borderColor: isDark ? '#363a45' : '#131722',
            backgroundColor: isDark ? '#363a45' : '#131722'
          }
        }
      },
      candle: {
        type: styles.candleType as any,
        bar: {
          upColor: styles.upColor,
          downColor: styles.downColor,
          noChangeColor: '#888888',
          upBorderColor: styles.upBorderColor,
          downBorderColor: styles.downBorderColor,
          noChangeBorderColor: '#888888',
          upWickColor: styles.upWickColor,
          downWickColor: styles.downWickColor,
          noChangeWickColor: '#888888',
        },
        area: {
          lineColor: styles.upColor,
          backgroundColor: [
            { offset: 0, color: styles.upColor.startsWith('#') ? `${styles.upColor}33` : 'rgba(8, 153, 129, 0.2)' },
            { offset: 1, color: 'transparent' }
          ]
        },
        priceMark: {
          last: {
            show: styles.showLastPrice,
            upColor: styles.upColor,
            downColor: styles.downColor,
            noChangeColor: '#888888',
          },
          high: {
            show: styles.showHighLow,
            color: isDark ? '#d1d4dc' : '#131722'
          },
          low: {
            show: styles.showHighLow,
            color: isDark ? '#d1d4dc' : '#131722'
          }
        },
        tooltip: {
          text: {
            color: isDark ? '#e2e8f0' : '#0f172a',
            size: 12
          }
        }
      },
      indicator: {
        tooltip: {
          text: {
            color: isDark ? '#e2e8f0' : '#0f172a',
            size: 12
          }
        }
      },
      overlay: {
        text: {
          color: '#ffffff',
          backgroundColor: isDark ? 'rgba(30, 34, 45, 0.9)' : 'rgba(15, 23, 42, 0.9)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          borderRadius: 4,
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 3,
          paddingBottom: 3
        }
      }
    });
  } catch (err) {
    console.warn('[TerminalPage] Failed to apply styles to chart:', err);
  }
};

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
  theme: 'dark' | 'light';
  candleStyles: ChartCandleStyles;
  onLayoutClick: () => void;
  onOpenSettings: () => void;
  onDrawingsUpdate?: (drawings: any[]) => void;
  onSaveState?: (symbol: SymbolInfo, period: Period) => void;
  chartRefCallback?: (chart: KLineChartPro | null) => void;
}

const SingleChartPane: React.FC<SingleChartProps> = ({
  paneId,
  initialSymbol,
  initialPeriod,
  theme,
  candleStyles,
  onLayoutClick,
  onOpenSettings,
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
        theme: theme,
        locale: 'en-US',
        timezone: 'Asia/Kolkata', // Set UTC+5:30 Kolkata as default
        symbol: initialSymbol,
        period: initialPeriod,
        periods: DEFAULT_PERIODS,
        datafeed: binanceDatafeed,
        chartType: candleStyles.candleType,
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
        onSettingClick: () => {
          onOpenSettings();
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

      // Apply initial custom candle styles
      applyCandleStylesToChart(chart, candleStyles, theme === 'dark');

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

      if (chart.ready) {
        chart.ready().then(() => {
          if (chart) applyCandleStylesToChart(chart, candleStyles, theme === 'dark');
          setTimeout(triggerResize, 100);
          setTimeout(triggerResize, 350);
        });
      }

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
              // Normalize deltaMode (0: pixels, 1: lines, 2: pages)
              let deltaY = e.deltaY;
              if (e.deltaMode === 1) deltaY *= 18;
              else if (e.deltaMode === 2) deltaY *= 100;

              // Smooth exponential damping:
              // Clamped to [-50, 50] to eliminate trackpad fling jumps while keeping mouse clicks natural.
              // Math.exp(deltaY * 0.0015): trackpad micro-glides give ~0.3% zoom, mouse notches give ~7.8% zoom.
              const clampedDelta = Math.max(-50, Math.min(50, deltaY));
              const factor = Math.exp(clampedDelta * 0.0015);

              const mid = (range.from + range.to) / 2;
              const newHalf = (range.range * factor) / 2;

              // Prevent collapse or runaway values
              if (newHalf <= 0.0000001 || !isFinite(newHalf)) return;

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

    // Track cursor hover and coordinates for TradingView shortcuts (Alt/Option + H, V, T, F, P, J, R, C)
    let isHovered = false;
    let mousePos: { x: number; y: number } | null = null;
    let lastCrosshair: any = null;

    const handleMouseEnter = () => { isHovered = true; };
    const handleMouseLeave = () => { isHovered = false; };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerEl.getBoundingClientRect();
      mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    containerEl.addEventListener('mouseenter', handleMouseEnter);
    containerEl.addEventListener('mouseleave', handleMouseLeave);
    containerEl.addEventListener('mousemove', handleMouseMove);

    try {
      const widget = chart?.getWidget?.();
      if (widget) {
        widget.subscribeAction?.('onCrosshairChange', (p: any) => {
          if (p) lastCrosshair = p;
        });
      }
    } catch (_) {}

    const syncDrawings = () => {
      try {
        const widget = chartInstanceRef.current?.getWidget?.();
        const overlayStore = widget?._chartStore?.getOverlayStore?.();
        if (overlayStore) {
          const instances = overlayStore.getInstances?.() || [];
          const serialized = instances.map((inst: any) => ({
            name: inst.name,
            id: inst.id,
            groupId: inst.groupId,
            lock: inst.lock,
            visible: inst.visible !== false,
            points: inst.points,
            styles: inst.styles,
            extendData: inst.extendData
          }));
          if (onDrawingsUpdate) onDrawingsUpdate(serialized);
        }
      } catch (_) {}
    };

    const handleChartShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Check if cursor is over this pane or if this is the active single chart
      if (!isHovered && paneId !== 'main-1') return;

      const widget = chartInstanceRef.current?.getWidget?.();
      if (!widget) return;

      // Handle Option key (Mac) or Alt key (Windows/Linux)
      if (e.altKey) {
        // 1. Opt + H: Horizontal Line at cursor
        if (e.code === 'KeyH') {
          e.preventDefault();
          e.stopPropagation();
          let price: number | null = null;
          if (mousePos) {
            try {
              const candlePane = widget.getDrawPaneById?.('candle_pane');
              const yAxis = candlePane?.getAxisComponent?.();
              price = yAxis?.convertFromPixel(mousePos.y);
            } catch (_) {}
          }
          if (price == null && lastCrosshair?.kLineData) {
            price = lastCrosshair.kLineData.close;
          }
          if (price == null) {
            try {
              const dataList = widget.getDataList?.();
              if (dataList && dataList.length > 0) {
                price = dataList[dataList.length - 1].close;
              }
            } catch (_) {}
          }
          if (price != null) {
            widget.createOverlay({
              name: 'horizontalStraightLine',
              points: [{ value: price }]
            });
            syncDrawings();
          }
          return;
        }

        // 2. Opt + V: Vertical Line at cursor
        if (e.code === 'KeyV') {
          e.preventDefault();
          e.stopPropagation();
          let timestamp: number | null = null;
          if (mousePos) {
            try {
              const timeScaleStore = widget._chartStore?.getTimeScaleStore?.();
              const dataIndex = timeScaleStore?.coordinateToDataIndex?.(mousePos.x);
              if (dataIndex !== undefined) {
                timestamp = timeScaleStore?.dataIndexToTimestamp?.(dataIndex);
              }
            } catch (_) {}
          }
          if (timestamp == null && lastCrosshair?.kLineData) {
            timestamp = lastCrosshair.kLineData.timestamp;
          }
          if (timestamp == null) {
            try {
              const dataList = widget.getDataList?.();
              if (dataList && dataList.length > 0) {
                timestamp = dataList[dataList.length - 1].timestamp;
              }
            } catch (_) {}
          }
          if (timestamp != null) {
            widget.createOverlay({
              name: 'verticalStraightLine',
              points: [{ timestamp }]
            });
            syncDrawings();
          }
          return;
        }

        // 3. Opt + T: Trend Line
        if (e.code === 'KeyT') {
          e.preventDefault();
          e.stopPropagation();
          widget.createOverlay('segment');
          return;
        }

        // 4. Opt + F: Fibonacci Retracement
        if (e.code === 'KeyF') {
          e.preventDefault();
          e.stopPropagation();
          widget.createOverlay('fibonacciLine');
          return;
        }

        // 5. Opt + P: Parallel Channel
        if (e.code === 'KeyP') {
          e.preventDefault();
          e.stopPropagation();
          widget.createOverlay('parallelStraightLine');
          return;
        }

        // 6. Opt + J: Crosshair Line
        if (e.code === 'KeyJ') {
          e.preventDefault();
          e.stopPropagation();
          let price: number | null = null;
          let timestamp: number | null = null;
          if (mousePos) {
            try {
              const candlePane = widget.getDrawPaneById?.('candle_pane');
              const yAxis = candlePane?.getAxisComponent?.();
              price = yAxis?.convertFromPixel(mousePos.y);
              const timeScaleStore = widget._chartStore?.getTimeScaleStore?.();
              const dataIndex = timeScaleStore?.coordinateToDataIndex?.(mousePos.x);
              if (dataIndex !== undefined) {
                timestamp = timeScaleStore?.dataIndexToTimestamp?.(dataIndex);
              }
            } catch (_) {}
          }
          if (price != null) {
            widget.createOverlay({ name: 'horizontalStraightLine', points: [{ value: price }] });
          }
          if (timestamp != null) {
            widget.createOverlay({ name: 'verticalStraightLine', points: [{ timestamp }] });
          }
          syncDrawings();
          return;
        }

        // 7. Opt + R: Reset Scale
        if (e.code === 'KeyR') {
          e.preventDefault();
          e.stopPropagation();
          try {
            const candlePane = widget.getDrawPaneById?.('candle_pane');
            candlePane?.getAxisComponent()?.setAutoCalcTickFlag(true);
            widget._chartStore?.getTimeScaleStore()?.resetOffsetRightDistance();
            widget.adjustPaneViewport(false, true, true, true);
          } catch (_) {}
          return;
        }

        // 8. Opt + C: Clear All Drawings
        if (e.code === 'KeyC') {
          e.preventDefault();
          e.stopPropagation();
          widget.removeOverlay();
          syncDrawings();
          return;
        }
      }
    };
    window.addEventListener('keydown', handleChartShortcuts, true);

    // Capture-phase interceptor for toolbar Setting button to open custom Candle & Theme settings
    const handleCaptureClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest('li') || target.closest('button') || target.closest('div');
      if (btn) {
        const text = (btn.textContent || '').trim();
        if ((text === 'Setting' || text.startsWith('Setting') || text === '设置') && !text.includes('Chart Type')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onOpenSettings();
        }
      }
    };
    containerEl.addEventListener('click', handleCaptureClick, true);

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
      window.removeEventListener('keydown', handleChartShortcuts, true);
      if (containerEl) {
        containerEl.removeEventListener('wheel', handleWheel);
        containerEl.removeEventListener('dblclick', handleDblClick);
        containerEl.removeEventListener('click', handleCaptureClick, true);
        containerEl.removeEventListener('mouseenter', handleMouseEnter);
        containerEl.removeEventListener('mouseleave', handleMouseLeave);
        containerEl.removeEventListener('mousemove', handleMouseMove);
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

  // Sync theme changes dynamically
  useEffect(() => {
    if (chartInstanceRef.current) {
      try {
        chartInstanceRef.current.setTheme(theme);
        applyCandleStylesToChart(chartInstanceRef.current, candleStyles, theme === 'dark');
      } catch (_) {}
    }
  }, [theme]);

  // Sync candleStyles changes dynamically
  useEffect(() => {
    if (chartInstanceRef.current) {
      applyCandleStylesToChart(chartInstanceRef.current, candleStyles, theme === 'dark');
    }
  }, [candleStyles]);

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
        backgroundColor: theme === 'dark' ? '#151517' : '#ffffff'
      }}
    />
  );
};

export const TerminalPage: React.FC = () => {
  const { theme, setTheme } = useTheme();

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
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Custom Candle & Bar Styling state
  const [candleStyles, setCandleStyles] = useState<ChartCandleStyles>(getStoredCandleStyles);
  const [syncBordersWicks, setSyncBordersWicks] = useState<boolean>(true);

  // Stored symbol & timeframe for primary chart
  const primarySymbol: SymbolInfo = savedState?.symbol || PRESET_SYMBOLS.BTCUSDT;
  const primaryPeriod: Period = savedState?.period || { multiplier: 1, timespan: 'hour', text: '1h' };

  // Track active chart instances for theme and style updates
  const activeChartsRef = useRef<Map<string, KLineChartPro>>(new Map());
  const primaryChartRef = useRef<KLineChartPro | null>(null);

  const registerChart = useCallback((id: string, inst: KLineChartPro | null) => {
    if (inst) {
      activeChartsRef.current.set(id, inst);
      if (id === 'main-1' || id === 'split-h-1' || id === 'split-v-1' || id === 'split-t-1' || id === 'grid-4-1') {
        primaryChartRef.current = inst;
      }
    } else {
      activeChartsRef.current.delete(id);
      if (primaryChartRef.current === inst) {
        primaryChartRef.current = null;
      }
    }
  }, []);

  // Update styles across all open charts and persist
  const handleUpdateCandleStyles = useCallback((newStyles: ChartCandleStyles) => {
    setCandleStyles(newStyles);
    try {
      localStorage.setItem(CANDLE_STYLES_KEY, JSON.stringify(newStyles));
    } catch (_) {}
    activeChartsRef.current.forEach((inst) => {
      applyCandleStylesToChart(inst, newStyles, theme === 'dark');
    });
  }, [theme]);

  // Undo / Redo Stacks for Drawings
  const undoStackRef = useRef<any[][]>([]);
  const redoStackRef = useRef<any[][]>([]);
  const isUndoRedoActionRef = useRef<boolean>(false);
  const [, setCanUndo] = useState<boolean>(false);
  const [, setCanRedo] = useState<boolean>(false);

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

  const isDark = theme === 'dark';
  const pageBgColor = isDark ? '#151517' : '#ffffff';
  const gridGapBgColor = isDark ? '#22242a' : '#ebedf1';

  return (
    <div
      className="w-full h-full flex flex-col flex-1 min-h-0 relative overflow-hidden"
      style={{
        width: '100%',
        height: 'calc(100vh - 4rem)',
        maxHeight: 'calc(100vh - 4rem)',
        backgroundColor: pageBgColor
      }}
    >
      {/* Multi-Chart Grid Renderers */}
      {layout === '1x1' && (
        <div
          className="grid grid-cols-1 grid-rows-1 flex-1 h-full w-full min-h-0 overflow-hidden"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: '1fr', backgroundColor: pageBgColor }}
        >
          <SingleChartPane
            paneId="main-1"
            initialSymbol={primarySymbol}
            initialPeriod={primaryPeriod}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onDrawingsUpdate={handleDrawingsUpdate}
            onSaveState={handleSaveState}
            chartRefCallback={(inst) => registerChart('main-1', inst)}
          />
        </div>
      )}

      {layout === '1x2' && (
        <div
          className="grid grid-cols-2 grid-rows-1 flex-1 h-full w-full min-h-0 overflow-hidden gap-[2px]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: '1fr', backgroundColor: gridGapBgColor }}
        >
          <SingleChartPane
            paneId="split-h-1"
            initialSymbol={primarySymbol}
            initialPeriod={primaryPeriod}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onDrawingsUpdate={handleDrawingsUpdate}
            onSaveState={handleSaveState}
            chartRefCallback={(inst) => registerChart('split-h-1', inst)}
          />
          <SingleChartPane
            paneId="split-h-2"
            initialSymbol={PRESET_SYMBOLS.ETHUSDT}
            initialPeriod={{ multiplier: 15, timespan: 'minute', text: '15m' }}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            chartRefCallback={(inst) => registerChart('split-h-2', inst)}
          />
        </div>
      )}

      {layout === '2x1' && (
        <div
          className="grid grid-cols-1 grid-rows-2 flex-1 h-full w-full min-h-0 overflow-hidden gap-[2px]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', backgroundColor: gridGapBgColor }}
        >
          <SingleChartPane
            paneId="split-v-1"
            initialSymbol={primarySymbol}
            initialPeriod={primaryPeriod}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onDrawingsUpdate={handleDrawingsUpdate}
            onSaveState={handleSaveState}
            chartRefCallback={(inst) => registerChart('split-v-1', inst)}
          />
          <SingleChartPane
            paneId="split-v-2"
            initialSymbol={PRESET_SYMBOLS.ETHUSDT}
            initialPeriod={{ multiplier: 15, timespan: 'minute', text: '15m' }}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            chartRefCallback={(inst) => registerChart('split-v-2', inst)}
          />
        </div>
      )}

      {layout === '1+2' && (
        <div
          className="grid grid-cols-2 grid-rows-1 flex-1 h-full w-full min-h-0 overflow-hidden gap-[2px]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: '1fr', backgroundColor: gridGapBgColor }}
        >
          <div className="h-full w-full min-h-0 overflow-hidden flex flex-col flex-1">
            <SingleChartPane
              paneId="split-t-1"
              initialSymbol={primarySymbol}
              initialPeriod={primaryPeriod}
              theme={theme}
              candleStyles={candleStyles}
              onLayoutClick={() => setShowLayoutModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)}
              onDrawingsUpdate={handleDrawingsUpdate}
              onSaveState={handleSaveState}
              chartRefCallback={(inst) => registerChart('split-t-1', inst)}
            />
          </div>
          <div
            className="grid grid-cols-1 grid-rows-2 h-full w-full min-h-0 overflow-hidden gap-[2px]"
            style={{ height: '100%', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', backgroundColor: gridGapBgColor }}
          >
            <SingleChartPane
              paneId="split-t-2"
              initialSymbol={PRESET_SYMBOLS.ETHUSDT}
              initialPeriod={{ multiplier: 15, timespan: 'minute', text: '15m' }}
              theme={theme}
              candleStyles={candleStyles}
              onLayoutClick={() => setShowLayoutModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)}
              chartRefCallback={(inst) => registerChart('split-t-2', inst)}
            />
            <SingleChartPane
              paneId="split-t-3"
              initialSymbol={PRESET_SYMBOLS.SOLUSDT}
              initialPeriod={{ multiplier: 1, timespan: 'hour', text: '1h' }}
              theme={theme}
              candleStyles={candleStyles}
              onLayoutClick={() => setShowLayoutModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)}
              chartRefCallback={(inst) => registerChart('split-t-3', inst)}
            />
          </div>
        </div>
      )}

      {layout === '2x2' && (
        <div
          className="grid grid-cols-2 grid-rows-2 flex-1 h-full w-full min-h-0 overflow-hidden gap-[2px]"
          style={{ flex: '1 1 0%', height: '100%', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', backgroundColor: gridGapBgColor }}
        >
          <SingleChartPane
            paneId="grid-4-1"
            initialSymbol={primarySymbol}
            initialPeriod={primaryPeriod}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onDrawingsUpdate={handleDrawingsUpdate}
            onSaveState={handleSaveState}
            chartRefCallback={(inst) => registerChart('grid-4-1', inst)}
          />
          <SingleChartPane
            paneId="grid-4-2"
            initialSymbol={PRESET_SYMBOLS.ETHUSDT}
            initialPeriod={{ multiplier: 15, timespan: 'minute', text: '15m' }}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            chartRefCallback={(inst) => registerChart('grid-4-2', inst)}
          />
          <SingleChartPane
            paneId="grid-4-3"
            initialSymbol={PRESET_SYMBOLS.SOLUSDT}
            initialPeriod={{ multiplier: 1, timespan: 'hour', text: '1h' }}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            chartRefCallback={(inst) => registerChart('grid-4-3', inst)}
          />
          <SingleChartPane
            paneId="grid-4-4"
            initialSymbol={PRESET_SYMBOLS.BNBUSDT}
            initialPeriod={{ multiplier: 4, timespan: 'hour', text: '4h' }}
            theme={theme}
            candleStyles={candleStyles}
            onLayoutClick={() => setShowLayoutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            chartRefCallback={(inst) => registerChart('grid-4-4', inst)}
          />
        </div>
      )}

      {/* TradingView-Style Chart Settings & Candle Color Customization Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className={`border rounded-2xl p-6 shadow-2xl max-w-lg w-full transition-colors ${
              isDark
                ? 'bg-[#1c1c20] border-white/10 text-white'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-4 border-b mb-5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-500" />
                  Chart Settings & Candle Colors
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  Customize candlestick colors, scale types, borders, wicks, and theme.
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
              {/* Theme Toggle Section */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  {isDark ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <div>
                    <div className="text-xs font-semibold">Chart Theme</div>
                    <div className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      {isDark ? 'Dark theme (TradingView Dark)' : 'Light theme (TradingView Light)'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isDark
                      ? 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                  }`}
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-purple-500" />}
                  <span>Switch to {isDark ? 'Light' : 'Dark'}</span>
                </button>
              </div>

              {/* Color Presets */}
              <div>
                <label className="text-xs font-semibold flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Color Palettes & Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        handleUpdateCandleStyles({
                          ...candleStyles,
                          upColor: preset.up,
                          downColor: preset.down,
                          upBorderColor: preset.up,
                          downBorderColor: preset.down,
                          upWickColor: preset.up,
                          downWickColor: preset.down
                        });
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        candleStyles.upColor.toLowerCase() === preset.up.toLowerCase() &&
                        candleStyles.downColor.toLowerCase() === preset.down.toLowerCase()
                          ? 'border-blue-500 bg-blue-500/10'
                          : isDark
                          ? 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex gap-1 shrink-0">
                        <span className="w-3 h-4 rounded-sm" style={{ backgroundColor: preset.up }} />
                        <span className="w-3 h-4 rounded-sm" style={{ backgroundColor: preset.down }} />
                      </div>
                      <span className="text-[11px] font-medium truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Candlestick Body Colors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    Candle Body Colors
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer opacity-80 hover:opacity-100">
                    <input
                      type="checkbox"
                      checked={syncBordersWicks}
                      onChange={(e) => setSyncBordersWicks(e.target.checked)}
                      className="rounded border-slate-400 text-blue-600 focus:ring-0"
                    />
                    <span>Sync border & wick colors</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Bullish (Up) */}
                  <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[11px] font-medium text-emerald-500">Bullish (Up)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={candleStyles.upColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateCandleStyles({
                            ...candleStyles,
                            upColor: val,
                            ...(syncBordersWicks ? { upBorderColor: val, upWickColor: val } : {})
                          });
                        }}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={candleStyles.upColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateCandleStyles({
                            ...candleStyles,
                            upColor: val,
                            ...(syncBordersWicks ? { upBorderColor: val, upWickColor: val } : {})
                          });
                        }}
                        className={`text-xs font-mono uppercase px-2 py-1 rounded border w-24 ${
                          isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Bearish (Down) */}
                  <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[11px] font-medium text-rose-500">Bearish (Down)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={candleStyles.downColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateCandleStyles({
                            ...candleStyles,
                            downColor: val,
                            ...(syncBordersWicks ? { downBorderColor: val, downWickColor: val } : {})
                          });
                        }}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={candleStyles.downColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateCandleStyles({
                            ...candleStyles,
                            downColor: val,
                            ...(syncBordersWicks ? { downBorderColor: val, downWickColor: val } : {})
                          });
                        }}
                        className={`text-xs font-mono uppercase px-2 py-1 rounded border w-24 ${
                          isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Candle Borders & Wicks (Visible when independent customizing is needed) */}
              {!syncBordersWicks && (
                <div className="space-y-3 pt-1 border-t border-dashed border-white/10">
                  <div className="text-[11px] font-semibold opacity-70">Custom Borders & Wicks</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between text-xs">
                      <span>Border Up</span>
                      <input
                        type="color"
                        value={candleStyles.upBorderColor}
                        onChange={(e) => handleUpdateCandleStyles({ ...candleStyles, upBorderColor: e.target.value })}
                        className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Border Down</span>
                      <input
                        type="color"
                        value={candleStyles.downBorderColor}
                        onChange={(e) => handleUpdateCandleStyles({ ...candleStyles, downBorderColor: e.target.value })}
                        className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Wick Up</span>
                      <input
                        type="color"
                        value={candleStyles.upWickColor}
                        onChange={(e) => handleUpdateCandleStyles({ ...candleStyles, upWickColor: e.target.value })}
                        className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Wick Down</span>
                      <input
                        type="color"
                        value={candleStyles.downWickColor}
                        onChange={(e) => handleUpdateCandleStyles({ ...candleStyles, downWickColor: e.target.value })}
                        className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Chart Display Style & Price Axis */}
              <div className="grid grid-cols-2 gap-3">
                {/* Chart Type */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5">Chart Type</label>
                  <select
                    value={candleStyles.candleType}
                    onChange={(e) => {
                      handleUpdateCandleStyles({
                        ...candleStyles,
                        candleType: e.target.value as any
                      });
                    }}
                    className={`w-full text-xs rounded-lg px-2.5 py-2 border transition-colors ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="candle_solid">Candles (Solid)</option>
                    <option value="candle_stroke">Hollow Candles</option>
                    <option value="ohlc">OHLC Bars</option>
                    <option value="area">Area Line</option>
                  </select>
                </div>

                {/* Price Axis Type */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5">Price Axis Type</label>
                  <select
                    value={candleStyles.priceAxisType}
                    onChange={(e) => {
                      handleUpdateCandleStyles({
                        ...candleStyles,
                        priceAxisType: e.target.value as any
                      });
                    }}
                    className={`w-full text-xs rounded-lg px-2.5 py-2 border transition-colors ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="normal">Normal (Linear)</option>
                    <option value="percentage">Percentage</option>
                    <option value="log">Logarithmic</option>
                  </select>
                </div>
              </div>

              {/* Price Line Toggles */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Show Last Price Line</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={candleStyles.showLastPrice}
                    onChange={(e) => handleUpdateCandleStyles({ ...candleStyles, showLastPrice: e.target.checked })}
                    className="rounded border-slate-400 text-blue-600 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    <span>Show Highest & Lowest Price Marks</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={candleStyles.showHighLow}
                    onChange={(e) => handleUpdateCandleStyles({ ...candleStyles, showHighLow: e.target.checked })}
                    className="rounded border-slate-400 text-blue-600 focus:ring-0"
                  />
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-between pt-4 mt-5 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  handleUpdateCandleStyles(DEFAULT_CANDLE_STYLES);
                }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isDark ? 'border-white/15 hover:bg-white/10 text-white/70' : 'border-slate-300 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Apply & Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TradingView-Style Layout Selection Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className={`border rounded-2xl p-6 shadow-2xl max-w-md w-full transition-colors ${
              isDark
                ? 'bg-[#1c1c20] border-white/10 text-white'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className={`flex items-center justify-between pb-4 border-b mb-5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-blue-400" />
                  Select Chart Layout
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  Choose a multi-chart view to monitor multiple currency pairs simultaneously.
                </p>
              </div>
              <button
                onClick={() => setShowLayoutModal(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                }`}
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
                    : isDark
                    ? 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-20 h-14 rounded-md border flex items-center justify-center ${isDark ? 'border-white/30 bg-white/10' : 'border-slate-300 bg-slate-200'}`}>
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
                    : isDark
                    ? 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-20 h-14 rounded-md border grid grid-cols-2 gap-1 p-1 ${isDark ? 'border-white/30 bg-white/10' : 'border-slate-300 bg-slate-200'}`}>
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
                    : isDark
                    ? 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-20 h-14 rounded-md border grid grid-rows-2 gap-1 p-1 ${isDark ? 'border-white/30 bg-white/10' : 'border-slate-300 bg-slate-200'}`}>
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
                    : isDark
                    ? 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-20 h-14 rounded-md border grid grid-cols-2 gap-1 p-1 ${isDark ? 'border-white/30 bg-white/10' : 'border-slate-300 bg-slate-200'}`}>
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
                    : isDark
                    ? 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-24 h-14 rounded-md border grid grid-cols-2 grid-rows-2 gap-1 p-1 ${isDark ? 'border-white/30 bg-white/10' : 'border-slate-300 bg-slate-200'}`}>
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
