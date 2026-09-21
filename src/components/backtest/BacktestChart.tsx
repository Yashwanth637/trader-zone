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
import { Scissors } from 'lucide-react';

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
  const [, setRangeTick] = useState(0); // Trigger re-render of SVG overlays on pan/zoom

  // Drag-and-Drop SL / TP / Limit Order State (Item 1)
  const [activeDrag, setActiveDrag] = useState<{
    type: 'SL' | 'TP' | 'LIMIT';
    orderId?: string;
    currentPrice: number;
  } | null>(null);

  // Cut Bar Hover Animation State (Item 4)
  const [cutHoverX, setCutHoverX] = useState<number | null>(null);
  const [cutHoverDate, setCutHoverDate] = useState<string | null>(null);

  // Initialize Lightweight Chart
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

    const handleRangeChange = () => {
      setRangeTick(t => t + 1);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);

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
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRangeChange);
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

  // TradingView Style Price Scale Wheel Zoom (Item 2: Gentle, reduced sensitivity)
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
        // Over right vertical price scale
        e.preventDefault();
        e.stopPropagation();

        const priceScale = chartRef.current.priceScale('right');
        const range = priceScale.getVisibleRange();
        if (range) {
          // Gentle, reduced sensitivity (Item 2)
          const clampedDelta = Math.max(-40, Math.min(40, e.deltaY));
          const zoomFactor = 1 + (clampedDelta * 0.001);
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

  // Update Static Entry Price Line on Chart Axis
  useEffect(() => {
    if (!seriesRef.current) return;

    priceLinesRef.current.forEach(line => {
      try {
        seriesRef.current?.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    const series = seriesRef.current;

    // Draw Entry reference line
    if (openPosition) {
      const entryLine = series.createPriceLine({
        price: openPosition.entryPrice,
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY: ${openPosition.entryPrice}`
      });
      priceLinesRef.current.push(entryLine);
    }
  }, [openPosition]);

  // Cut Bar Hover & Click Handling with Animation (Item 4)
  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !chartRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (isCutMode) {
      setCutHoverX(x);
      const time = chartRef.current.timeScale().coordinateToTime(x) as number | null;
      if (time !== null) {
        const d = new Date(time * 1000);
        setCutHoverDate(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
      }
    } else {
      if (cutHoverX !== null) setCutHoverX(null);
    }
  };

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

      setCutHoverX(null);
      setCutHoverDate(null);
      onCutAtBar(closestIdx);
    }
  };

  // Drag & Drop SL / TP / Limit Orders System (Item 1)
  const handleStartDrag = (type: 'SL' | 'TP' | 'LIMIT', orderId?: string, initPrice?: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag({ type, orderId, currentPrice: initPrice || 0 });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!activeDrag || !seriesRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const price = seriesRef.current.coordinateToPrice(y);
    if (price === null) return;

    const roundedPrice = parseFloat(price.toFixed(2));
    setActiveDrag(prev => prev ? { ...prev, currentPrice: roundedPrice } : null);

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
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Calculate live SVG screen coordinates for SL / TP lines
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
        isCutMode ? 'cursor-crosshair' : ''
      }`}
      onClick={handleChartClick}
      onMouseMove={handleChartMouseMove}
      onMouseLeave={() => { if (isCutMode) setCutHoverX(null); }}
    >
      {/* Lightweight Charts DOM Canvas */}
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

      {/* Item 4: Cut Bar Animation & Future Candles Fading Overlay */}
      {isCutMode && cutHoverX !== null && (
        <svg
          className="absolute inset-0 pointer-events-none z-25"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          {/* Faded Mask Covering Future Candles (To the right of the cutting line) */}
          <rect
            x={cutHoverX}
            y={0}
            width={Math.max(0, dimensions.width - cutHoverX)}
            height={dimensions.height}
            fill="rgba(5, 7, 15, 0.72)"
            className="transition-opacity duration-150"
          />

          {/* Vertical Cyan/Rose Cutting Line */}
          <line
            x1={cutHoverX}
            y1={0}
            x2={cutHoverX}
            y2={dimensions.height}
            stroke="#38bdf8"
            strokeWidth={2}
            strokeDasharray="5 3"
          />

          {/* Scissor / Cut Indicator Badge */}
          <g transform={`translate(${Math.max(10, Math.min(dimensions.width - 180, cutHoverX - 80))}, 18)`}>
            <rect
              width={160}
              height={28}
              rx={14}
              fill="#0284c7"
              stroke="#bae6fd"
              strokeWidth={1.5}
              className="drop-shadow-lg"
            />
            <text
              x={80}
              y={18}
              fill="#ffffff"
              fontSize={11}
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
            >
              ✂ Cut Replay to This Bar
            </text>
          </g>

          {cutHoverDate && (
            <g transform={`translate(${Math.max(10, Math.min(dimensions.width - 140, cutHoverX - 60))}, 52)`}>
              <rect
                width={120}
                height={20}
                rx={6}
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth={1}
              />
              <text
                x={60}
                y={14}
                fill="#38bdf8"
                fontSize={10}
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                {cutHoverDate}
              </text>
            </g>
          )}
        </svg>
      )}

      {/* Item 1: Moveable Drag-and-Drop SL & TP Overlay System */}
      <svg
        className="absolute inset-0 pointer-events-none z-20"
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
              y={entryY + 4}
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

        {/* Moveable Stop Loss (SL) Line & Drag Pill */}
        {slY !== null && openPosition?.stopLoss !== undefined && (
          <g
            className="pointer-events-auto cursor-ns-resize group"
            onPointerDown={handleStartDrag('SL', undefined, openPosition.stopLoss)}
            onPointerMove={handlePointerMoveDrag}
            onPointerUp={handlePointerUpDrag}
          >
            {/* Wide Invisible Hit Zone for Effortless Grabbing Anywhere on Line */}
            <line
              x1={0}
              y1={slY}
              x2={dimensions.width - 65}
              y2={slY}
              stroke="transparent"
              strokeWidth={28}
            />

            {/* Visible Dashed Red Line */}
            <line
              x1={0}
              y1={slY}
              x2={dimensions.width - 65}
              y2={slY}
              stroke="#f43f5e"
              strokeWidth={activeDrag?.type === 'SL' ? 3 : 2}
              strokeDasharray={activeDrag?.type === 'SL' ? 'none' : '6 3'}
              className="group-hover:stroke-width-[3] transition-all"
            />

            {/* Draggable Stop Loss Handle Badge */}
            <rect
              x={dimensions.width - 240}
              y={slY - 13}
              width={165}
              height={26}
              rx={7}
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth={activeDrag?.type === 'SL' ? 2 : 1}
              className="drop-shadow-lg group-hover:brightness-110 active:scale-95 transition-transform"
            />
            <text
              x={dimensions.width - 158}
              y={slY + 5}
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

        {/* Moveable Take Profit (TP) Line & Drag Pill */}
        {tpY !== null && openPosition?.takeProfit !== undefined && (
          <g
            className="pointer-events-auto cursor-ns-resize group"
            onPointerDown={handleStartDrag('TP', undefined, openPosition.takeProfit)}
            onPointerMove={handlePointerMoveDrag}
            onPointerUp={handlePointerUpDrag}
          >
            {/* Wide Invisible Hit Zone */}
            <line
              x1={0}
              y1={tpY}
              x2={dimensions.width - 65}
              y2={tpY}
              stroke="transparent"
              strokeWidth={28}
            />

            {/* Visible Dashed Emerald Line */}
            <line
              x1={0}
              y1={tpY}
              x2={dimensions.width - 65}
              y2={tpY}
              stroke="#10b981"
              strokeWidth={activeDrag?.type === 'TP' ? 3 : 2}
              strokeDasharray={activeDrag?.type === 'TP' ? 'none' : '6 3'}
              className="group-hover:stroke-width-[3] transition-all"
            />

            {/* Draggable Take Profit Handle Badge */}
            <rect
              x={dimensions.width - 240}
              y={tpY - 13}
              width={165}
              height={26}
              rx={7}
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth={activeDrag?.type === 'TP' ? 2 : 1}
              className="drop-shadow-lg group-hover:brightness-110 active:scale-95 transition-transform"
            />
            <text
              x={dimensions.width - 158}
              y={tpY + 5}
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

        {/* Moveable Pending Limit Orders */}
        {pendingOrders.map(order => {
          if (!seriesRef.current) return null;
          const ordY = seriesRef.current.priceToCoordinate(order.price);
          if (ordY === null) return null;

          return (
            <g
              key={order.id}
              className="pointer-events-auto cursor-ns-resize group"
              onPointerDown={handleStartDrag('LIMIT', order.id, order.price)}
              onPointerMove={handlePointerMoveDrag}
              onPointerUp={handlePointerUpDrag}
            >
              <line
                x1={0}
                y1={ordY}
                x2={dimensions.width - 65}
                y2={ordY}
                stroke="transparent"
                strokeWidth={24}
              />
              <line
                x1={0}
                y1={ordY}
                x2={dimensions.width - 65}
                y2={ordY}
                stroke={order.side === 'BUY' ? '#34d399' : '#fb7185'}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <rect
                x={dimensions.width - 245}
                y={ordY - 11}
                width={170}
                height={22}
                rx={6}
                fill={order.side === 'BUY' ? '#059669' : '#e11d48'}
                stroke="#ffffff"
                strokeWidth={1}
                className="drop-shadow-md group-hover:brightness-110"
              />
              <text
                x={dimensions.width - 160}
                y={ordY + 4}
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
    </div>
  );
};
