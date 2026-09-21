import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
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
  onModifyPosition?: (params: { stopLoss?: number; takeProfit?: number }) => void;
  onModifyLimitOrder?: (orderId: string, price: number) => void;
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
  onApplyPositionToOrder,
  onModifyPosition,
  onModifyLimitOrder
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [activeDrag, setActiveDrag] = useState<{
    type: 'SL' | 'TP' | 'LIMIT';
    orderId?: string;
  } | null>(null);

  // Initialize Lightweight Chart with full TradingView interaction options
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#000000' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
        fontFamily: "'Arial', 'Helvetica', sans-serif"
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }
      },
      crosshair: {
        mode: 1
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
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
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

  // Update theme colors when theme changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#000000' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
        fontFamily: "'Arial', 'Helvetica', sans-serif"
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
      }
    });
  }, [isDark]);

  // TradingView Style Price Scale Wheel Zoom & Double-Click Reset
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!chartRef.current) return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartWidth = rect.width;
      const priceScaleWidth = 65;

      if (mouseX >= chartWidth - priceScaleWidth) {
        // User is hovering on the price scale and scrolling!
        e.preventDefault();
        e.stopPropagation();

        const priceScale = chartRef.current.priceScale('right');
        const range = priceScale.getVisibleRange();
        if (range) {
          const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
          const mid = (range.from + range.to) / 2;
          const half = ((range.to - range.from) / 2) * zoomFactor;

          priceScale.setAutoScale(false);
          priceScale.setVisibleRange({
            from: mid - half,
            to: mid + half
          });
        }
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      if (!chartRef.current) return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      if (mouseX >= rect.width - 65) {
        chartRef.current.priceScale('right').setAutoScale(true);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('dblclick', handleDblClick);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('dblclick', handleDblClick);
    };
  }, []);

  // Update visible candles when currentIndex changes or candles load
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;
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

  // Update Visual Price Lines on the Lightweight Chart Axis
  useEffect(() => {
    if (!seriesRef.current) return;

    priceLinesRef.current.forEach(line => {
      try {
        seriesRef.current?.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    const series = seriesRef.current;

    // 1. Open Position Lines
    if (openPosition) {
      const entryLine = series.createPriceLine({
        price: openPosition.entryPrice,
        color: '#38bdf8',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY ${openPosition.side} @ ${openPosition.entryPrice}`
      });
      priceLinesRef.current.push(entryLine);

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

  // Drag and modify Stop Loss / Take Profit / Limit Orders directly on chart (Item 7)
  const handlePointerDownDrag = (type: 'SL' | 'TP' | 'LIMIT', orderId?: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveDrag({ type, orderId });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!activeDrag || !seriesRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const price = seriesRef.current.coordinateToPrice(y);
    if (price === null) return;

    const roundedPrice = parseFloat(price.toFixed(2));

    if (activeDrag.type === 'SL' && onModifyPosition) {
      onModifyPosition({ stopLoss: roundedPrice });
    } else if (activeDrag.type === 'TP' && onModifyPosition) {
      onModifyPosition({ takeProfit: roundedPrice });
    } else if (activeDrag.type === 'LIMIT' && activeDrag.orderId && onModifyLimitOrder) {
      onModifyLimitOrder(activeDrag.orderId, roundedPrice);
    }
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    if (activeDrag) {
      setActiveDrag(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Convert prices to SVG screen Y for draggable trade line overlays
  const slY = openPosition?.stopLoss !== undefined && seriesRef.current
    ? seriesRef.current.priceToCoordinate(openPosition.stopLoss)
    : null;

  const tpY = openPosition?.takeProfit !== undefined && seriesRef.current
    ? seriesRef.current.priceToCoordinate(openPosition.takeProfit)
    : null;

  const entryY = openPosition && seriesRef.current
    ? seriesRef.current.priceToCoordinate(openPosition.entryPrice)
    : null;

  return (
    <div
      className={`relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-border/40 dark:border-white/[0.08] bg-surface select-none ${
        isCutMode ? 'cursor-crosshair ring-2 ring-rose-500' : ''
      }`}
      onClick={handleChartClick}
      onPointerMove={handlePointerMoveDrag}
      onPointerUp={handlePointerUpDrag}
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

      {/* Interactive On-Chart Draggable Trade Lines (Item 7) */}
      <svg
        className="absolute inset-0 pointer-events-none z-15"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* Entry Line Indicator */}
        {entryY !== null && openPosition && (
          <g>
            <line
              x1={0}
              y1={entryY}
              x2={dimensions.width - 65}
              y2={entryY}
              stroke="#38bdf8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <rect
              x={12}
              y={entryY - 10}
              width={120}
              height={20}
              rx={5}
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth={1}
            />
            <text
              x={72}
              y={entryY + 3.5}
              fill="#38bdf8"
              fontSize={10}
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
            >
              ENTRY: {openPosition.entryPrice}
            </text>
          </g>
        )}

        {/* Draggable Stop Loss Handle */}
        {slY !== null && openPosition?.stopLoss !== undefined && (
          <g
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={handlePointerDownDrag('SL')}
          >
            <line
              x1={0}
              y1={slY}
              x2={dimensions.width - 65}
              y2={slY}
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            <rect
              x={dimensions.width - 235}
              y={slY - 11}
              width={160}
              height={22}
              rx={6}
              fill="#f43f5e"
              className="hover:brightness-110 active:scale-95 transition-transform"
            />
            <text
              x={dimensions.width - 155}
              y={slY + 4}
              fill="#ffffff"
              fontSize={11}
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
            >
              ↕ SL: {openPosition.stopLoss} (Drag)
            </text>
          </g>
        )}

        {/* Draggable Take Profit Handle */}
        {tpY !== null && openPosition?.takeProfit !== undefined && (
          <g
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={handlePointerDownDrag('TP')}
          >
            <line
              x1={0}
              y1={tpY}
              x2={dimensions.width - 65}
              y2={tpY}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            <rect
              x={dimensions.width - 235}
              y={tpY - 11}
              width={160}
              height={22}
              rx={6}
              fill="#10b981"
              className="hover:brightness-110 active:scale-95 transition-transform"
            />
            <text
              x={dimensions.width - 155}
              y={tpY + 4}
              fill="#ffffff"
              fontSize={11}
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
            >
              ↕ TP: {openPosition.takeProfit} (Drag)
            </text>
          </g>
        )}

        {/* Draggable Pending Limit Orders */}
        {pendingOrders.map(order => {
          if (!seriesRef.current) return null;
          const ordY = seriesRef.current.priceToCoordinate(order.price);
          if (ordY === null) return null;

          return (
            <g
              key={order.id}
              className="pointer-events-auto cursor-ns-resize"
              onPointerDown={handlePointerDownDrag('LIMIT', order.id)}
            >
              <line
                x1={0}
                y1={ordY}
                x2={dimensions.width - 65}
                y2={ordY}
                stroke={order.side === 'BUY' ? '#34d399' : '#fb7185'}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <rect
                x={dimensions.width - 245}
                y={ordY - 10}
                width={170}
                height={20}
                rx={5}
                fill={order.side === 'BUY' ? '#059669' : '#e11d48'}
                className="hover:brightness-110 active:scale-95 transition-transform"
              />
              <text
                x={dimensions.width - 160}
                y={ordY + 3.5}
                fill="#ffffff"
                fontSize={10}
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                ↕ {order.side} LIMIT: {order.price} (Drag)
              </text>
            </g>
          );
        })}
      </svg>

      {/* Cut Bar Active Banner */}
      {isCutMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-rose-500/90 text-white text-xs font-bold shadow-lg shadow-rose-500/30 flex items-center gap-2">
          <span>Click on any candle bar to cut and replay from that point</span>
        </div>
      )}
    </div>
  );
};
