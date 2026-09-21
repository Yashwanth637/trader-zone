import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  ColorType,
  LineStyle,
  IChartApi,
  ISeriesApi,
  IPriceLine
} from 'lightweight-charts';
import {
  BacktestCandle,
  BacktestDrawing,
  BacktestPosition,
  BacktestOrder,
  DrawingType
} from '../../types/backtest';
import { DrawingOverlay } from './DrawingOverlay';

interface BacktestChartProps {
  candles: BacktestCandle[];
  currentIndex: number;
  openPosition: BacktestPosition | null;
  pendingOrders: BacktestOrder[];
  activeTool: DrawingType;
  onToolUsed: () => void;
  drawings: BacktestDrawing[];
  onUpdateDrawings: (drawings: BacktestDrawing[]) => void;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  isCutMode: boolean;
  onCutAtBar: (index: number) => void;
  onApplyPositionToOrder?: (entry: number, sl: number, tp: number, side: 'BUY' | 'SELL') => void;
}

export const BacktestChart: React.FC<BacktestChartProps> = ({
  candles,
  currentIndex,
  openPosition,
  pendingOrders,
  activeTool,
  onToolUsed,
  drawings,
  onUpdateDrawings,
  selectedDrawingId,
  onSelectDrawing,
  isCutMode,
  onCutAtBar,
  onApplyPositionToOrder
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Initialize Lightweight Chart
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        fontFamily: "'JetBrains Mono', 'Inter', monospace"
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' }
      },
      crosshair: {
        mode: 1
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255, 255, 255, 0.08)'
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)'
      }
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e'
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight || 500;
        chart.applyOptions({ width: w, height: h });
        setDimensions({ width: w, height: h });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, []);

  // Update visible candles when currentIndex changes or candles load
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    // Sliced candles up to current step
    const visible = candles.slice(0, Math.min(currentIndex + 1, candles.length));
    seriesRef.current.setData(visible as any);
  }, [candles, currentIndex]);

  // Fit content on first load or when switching symbols
  const lastSymbolTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;
    const firstTime = candles[0]?.time;
    if (firstTime !== lastSymbolTimeRef.current) {
      lastSymbolTimeRef.current = firstTime;
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  // Update Visual Price Lines for Open Position and Pending Orders
  useEffect(() => {
    if (!seriesRef.current) return;

    // Clear old price lines
    priceLinesRef.current.forEach(line => {
      try {
        seriesRef.current?.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    const series = seriesRef.current;

    // 1. Open Position Lines
    if (openPosition) {
      // Entry Line
      const entryLine = series.createPriceLine({
        price: openPosition.entryPrice,
        color: '#38bdf8',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `OPEN ${openPosition.side} @ ${openPosition.entryPrice}`
      });
      priceLinesRef.current.push(entryLine);

      // Stop Loss Line
      if (openPosition.stopLoss !== undefined) {
        const slLine = series.createPriceLine({
          price: openPosition.stopLoss,
          color: '#f43f5e',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL: ${openPosition.stopLoss}`
        });
        priceLinesRef.current.push(slLine);
      }

      // Take Profit Line
      if (openPosition.takeProfit !== undefined) {
        const tpLine = series.createPriceLine({
          price: openPosition.takeProfit,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP: ${openPosition.takeProfit}`
        });
        priceLinesRef.current.push(tpLine);
      }
    }

    // 2. Pending Orders
    pendingOrders.forEach(order => {
      const orderLine = series.createPriceLine({
        price: order.price,
        color: order.side === 'BUY' ? '#34d399' : '#fb7185',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `LIMIT ${order.side} @ ${order.price}`
      });
      priceLinesRef.current.push(orderLine);
    });
  }, [openPosition, pendingOrders]);

  // Handle Cut Bar Click
  const handleChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCutMode || !chartRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = chartRef.current.timeScale().coordinateToTime(x) as number | null;

    if (clickedTime !== null) {
      // Locate closest candle index in full candles array
      let closestIdx = 0;
      let minDiff = Infinity;

      for (let i = 0; i < candles.length; i++) {
        const diff = Math.abs(candles[i].time - clickedTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      onCutAtBar(closestIdx);
    }
  };

  return (
    <div
      className={`relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-border/80 bg-surface select-none ${
        isCutMode ? 'cursor-crosshair ring-2 ring-rose-500' : ''
      }`}
      onClick={handleChartClick}
    >
      {/* Lightweight Charts DOM Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* SVG Interactive Drawing Overlay */}
      <DrawingOverlay
        chart={chartRef.current}
        series={seriesRef.current}
        width={dimensions.width}
        height={dimensions.height}
        activeTool={activeTool}
        onToolUsed={onToolUsed}
        drawings={drawings}
        onUpdateDrawings={onUpdateDrawings}
        selectedDrawingId={selectedDrawingId}
        onSelectDrawing={onSelectDrawing}
        onApplyPositionToOrder={onApplyPositionToOrder}
      />

      {/* Cut Bar Active Banner */}
      {isCutMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-rose-500/90 text-white text-xs font-bold shadow-lg shadow-rose-500/30 flex items-center gap-2">
          <span>Click on any candle bar to cut and replay from that point</span>
        </div>
      )}
    </div>
  );
};
