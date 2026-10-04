import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  LineStyle,
  IChartApi,
  ISeriesApi,
  IPriceLine
} from 'lightweight-charts';
import { BacktestCandle, BacktestDrawing, DrawingType } from '../../types/backtest';
import { DrawingOverlay } from '../backtest/DrawingOverlay';
import { DrawingToolbar } from '../backtest/DrawingToolbar';
import { IndicatorZonesOverlay } from './IndicatorZonesOverlay';
import { TerminalChartTheme } from './ChartSettingsModal';
import { IndicatorExecutionResult } from '../../lib/pineScriptEngine';
import { LiveKlineTick } from '../../lib/liveMarketStreamService';
import { Loader2, PenTool, Clock, Radio } from 'lucide-react';

interface TerminalProChartProps {
  symbol: string;
  timeframe: string;
  theme: 'dark' | 'light';
  chartColors: TerminalChartTheme;
  activeIndicator: IndicatorExecutionResult | null;
  userId?: string;
  candles: BacktestCandle[];
  loading: boolean;
  liveTick?: LiveKlineTick | null;
  currentPrice?: number | null;
  countdown?: string;
  countdownPercent?: number;
}

export const TerminalProChart: React.FC<TerminalProChartProps> = ({
  symbol,
  timeframe,
  theme,
  chartColors,
  activeIndicator,
  userId,
  candles,
  loading,
  liveTick,
  currentPrice,
  countdown,
  countdownPercent
}) => {
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<any[]>([]);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const countdownPriceLineRef = useRef<IPriceLine | null>(null);

  // Canvas Dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Drawing Tools State
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [activeTool, setActiveTool] = useState<DrawingType>('cursor');
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // Persistent Drawings per User and Symbol
  const drawingsStorageKey = `tz_terminal_drawings_${userId || 'guest'}_${symbol}`;
  const [drawings, setDrawings] = useState<BacktestDrawing[]>(() => {
    try {
      const saved = localStorage.getItem(drawingsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Reload drawings when symbol or userId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(drawingsStorageKey);
      setDrawings(saved ? JSON.parse(saved) : []);
      setSelectedDrawingId(null);
    } catch {
      setDrawings([]);
    }
  }, [drawingsStorageKey]);

  // Save drawings whenever modified
  const handleUpdateDrawings = useCallback(
    (newDrawings: BacktestDrawing[]) => {
      setDrawings(newDrawings);
      try {
        localStorage.setItem(drawingsStorageKey, JSON.stringify(newDrawings));
      } catch (e) {
        console.error('Failed to save terminal drawings:', e);
      }
    },
    [drawingsStorageKey]
  );

  // Initialize and mount Lightweight Chart
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    setDimensions({ width, height });

    // Use user-selected background color directly, or fallback to theme default
    const canvasBg = chartColors.backgroundColor || (isDark ? '#0a0d14' : '#ffffff');
    const isBgLight = (() => {
      if (!canvasBg || typeof canvasBg !== 'string') return false;
      const clean = canvasBg.replace('#', '');
      if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 130;
      }
      if (clean.length === 6) {
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 130;
      }
      return false;
    })();

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: {
          type: ColorType.Solid,
          color: canvasBg
        },
        textColor: isBgLight ? '#475569' : '#94a3b8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      },
      grid: {
        vertLines: {
          visible: chartColors.showGrid,
          color: isBgLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)'
        },
        horzLines: {
          visible: chartColors.showGrid,
          color: isBgLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)'
        }
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: isBgLight ? 'rgba(30, 41, 59, 0.55)' : 'rgba(255, 255, 255, 0.45)',
          width: 1,
          style: LineStyle.Dashed
        },
        horzLine: {
          color: isBgLight ? 'rgba(30, 41, 59, 0.55)' : 'rgba(255, 255, 255, 0.45)',
          width: 1,
          style: LineStyle.Dashed
        }
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: {
          time: true,
          price: true
        },
        axisDoubleClickReset: {
          time: true,
          price: true
        }
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.15
        }
      }
    });

    chartRef.current = chart;

    // Candlestick Series with Custom Theme Colors
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: chartColors.upColor,
      downColor: chartColors.downColor,
      borderUpColor: chartColors.borderUpColor,
      borderDownColor: chartColors.borderDownColor,
      wickUpColor: chartColors.wickUpColor,
      wickDownColor: chartColors.wickDownColor
    });

    seriesRef.current = candlestickSeries;

    // Feed candles if available
    if (candles.length > 0) {
      const formatted = candles.map(c => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }));
      candlestickSeries.setData(formatted);
      chart.timeScale().fitContent();
    }

    // Resize Observer for 100% fluid responsive scaling
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0) {
          setDimensions({ width: newWidth, height: newHeight });
          chart.applyOptions({ width: newWidth, height: newHeight });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (countdownPriceLineRef.current && seriesRef.current) {
        try {
          seriesRef.current.removePriceLine(countdownPriceLineRef.current);
        } catch {}
        countdownPriceLineRef.current = null;
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [
    isDark,
    chartColors.backgroundColor,
    chartColors.showGrid,
    chartColors.upColor,
    chartColors.downColor,
    chartColors.borderUpColor,
    chartColors.borderDownColor,
    chartColors.wickUpColor,
    chartColors.wickDownColor
  ]);

  // Update Candle Data when candles change
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const formatted = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    seriesRef.current.setData(formatted);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Apply Real-Time Live Market Kline Ticks Directly
  useEffect(() => {
    if (!seriesRef.current || !liveTick) return;
    try {
      seriesRef.current.update({
        time: liveTick.time as any,
        open: liveTick.open,
        high: liveTick.high,
        low: liveTick.low,
        close: liveTick.close
      });
    } catch (e) {
      console.error('Error updating live tick on chart series:', e);
    }
  }, [liveTick]);

  // Synchronize Live Price Line and Bar Close Countdown Timer on Right Price Scale
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || currentPrice === null || currentPrice === undefined) {
      if (countdownPriceLineRef.current && series) {
        try {
          series.removePriceLine(countdownPriceLineRef.current);
        } catch {}
        countdownPriceLineRef.current = null;
      }
      return;
    }

    const isPriceUp = liveTick ? liveTick.close >= liveTick.open : true;
    const lineColor = isPriceUp ? chartColors.upColor : chartColors.downColor;
    const lineTitle = countdown ? `⏱ ${countdown}` : '';

    if (!countdownPriceLineRef.current) {
      countdownPriceLineRef.current = series.createPriceLine({
        price: currentPrice,
        color: lineColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: lineTitle
      });
    } else {
      countdownPriceLineRef.current.applyOptions({
        price: currentPrice,
        color: lineColor,
        title: lineTitle,
        axisLabelVisible: true
      });
    }
  }, [currentPrice, countdown, liveTick?.close, liveTick?.open, chartColors.upColor, chartColors.downColor]);

  // Render Active Pine Script Indicator Plots
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Clean up previous indicator series
    indicatorSeriesRef.current.forEach(s => {
      try {
        chart.removeSeries(s);
      } catch {}
    });
    indicatorSeriesRef.current = [];

    // Clean up previous price lines
    if (seriesRef.current) {
      priceLinesRef.current.forEach(pl => {
        try {
          seriesRef.current?.removePriceLine(pl);
        } catch {}
      });
      priceLinesRef.current = [];
    }

    if (!activeIndicator || !activeIndicator.success) return;

    // Render Plots (Lines)
    activeIndicator.plots.forEach(plot => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: plot.color,
        lineWidth: (plot.lineWidth as any) || 2,
        title: plot.title,
        priceLineVisible: false
      });

      const formatted = plot.data.map(p => ({
        time: p.time as any,
        value: p.value
      }));

      lineSeries.setData(formatted);
      indicatorSeriesRef.current.push(lineSeries);
    });

    // Render Horizontal reference levels (hlines)
    if (seriesRef.current && activeIndicator.hlines.length > 0) {
      activeIndicator.hlines.forEach(hl => {
        const pl = seriesRef.current!.createPriceLine({
          price: hl.value,
          color: hl.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: hl.title || `${hl.value}`
        });
        priceLinesRef.current.push(pl);
      });
    }
  }, [activeIndicator]);

  const formatDisplayPrice = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '--';
    if (val >= 1000) {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (val >= 1) {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    } else {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
    }
  };

  return (
    <div
      className="w-full h-full relative select-none overflow-hidden"
      style={{ backgroundColor: chartColors.backgroundColor || (isDark ? '#0a0d14' : '#ffffff') }}
    >
      {/* Loading Overlay */}
      {loading && candles.length === 0 && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <div className="text-xs font-bold text-foreground">Loading {symbol} candles...</div>
        </div>
      )}

      {/* Floating Drawing Toolbar (Top Left) */}
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
            className="p-2 rounded-xl bg-surface-card/90 backdrop-blur-md border border-border/40 text-muted hover:text-foreground shadow-lg flex items-center gap-1.5 text-xs font-semibold hover:border-primary/40 transition-all"
          >
            <PenTool className="w-4 h-4 text-primary" />
            <span>Tools</span>
          </button>
        )}
      </div>

      {/* Floating Live Market & Bar Countdown HUD (Top Right) */}
      <div className="absolute top-3 right-16 sm:right-20 z-20 pointer-events-auto">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface-card/90 backdrop-blur-md border border-border/70 shadow-lg text-xs font-semibold">
          {/* Live Pulse Indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black tracking-wider text-emerald-400 uppercase">LIVE</span>
          </div>

          <div className="h-3 w-px bg-border/60" />

          {/* Live Price */}
          <div
            className={`font-mono font-bold ${
              liveTick && liveTick.close < liveTick.open ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {formatDisplayPrice(currentPrice)}
          </div>

          <div className="h-3 w-px bg-border/60" />

          {/* Timeframe Countdown */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-foreground">{countdown || '--:--'}</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-surface border border-border text-muted">
              {timeframe}
            </span>
          </div>

          {/* Mini Elapsed Bar Progress */}
          {countdownPercent !== undefined && (
            <div
              className="w-10 h-1.5 bg-surface rounded-full overflow-hidden border border-border/40 hidden md:block"
              title={`${Math.round(countdownPercent)}% of active bar completed`}
            >
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, countdownPercent))}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Canvas Mount Target */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ overscrollBehavior: 'contain' }}
      />

      {/* Visual Pine Script Zone Corridors Overlay (e.g. Yashwanth's Indicator Horizon Zones) */}
      {activeIndicator?.boxes && activeIndicator.boxes.length > 0 && (
        <IndicatorZonesOverlay
          chart={chartRef.current}
          series={seriesRef.current}
          boxes={activeIndicator.boxes}
          width={dimensions.width}
          height={dimensions.height}
        />
      )}

      {/* SVG Interactive Drawing Overlay */}
      <DrawingOverlay
        chart={chartRef.current}
        series={seriesRef.current}
        width={dimensions.width}
        height={dimensions.height}
        activeTool={activeTool}
        onToolUsed={() => setActiveTool('cursor')}
        drawings={drawings}
        onUpdateDrawings={handleUpdateDrawings}
        selectedDrawingId={selectedDrawingId}
        onSelectDrawing={setSelectedDrawingId}
      />
    </div>
  );
};
