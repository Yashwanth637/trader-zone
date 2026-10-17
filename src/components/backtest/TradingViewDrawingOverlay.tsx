import React, { useRef, useEffect, useState, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { BacktestDrawing, DrawingType, ChartPoint, BacktestCandle } from '../../types/backtest';
import { useTheme } from '../../context/ThemeContext';
import { Trash2, Lock, Unlock, Palette, Check } from 'lucide-react';

interface TradingViewDrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  candles?: BacktestCandle[];
  width: number;
  height: number;
  activeTool: DrawingType;
  onToolUsed: () => void;
  drawings: BacktestDrawing[];
  onUpdateDrawings: (drawings: BacktestDrawing[]) => void;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  isMagnetMode?: boolean;
  isLocked?: boolean;
  isDrawingLocked?: boolean;
  isHidden?: boolean;
  isDrawingHidden?: boolean;
  onApplyPositionToOrder?: (entry: number, sl: number, tp: number, side: 'BUY' | 'SELL') => void;
  symbol?: string;
}

interface DragState {
  drawingId: string;
  mode: 'MOVE' | 'POINT';
  pointIndex?: number;
  handleKey?: 'TP' | 'SL' | 'ENTRY';
  startMouseX: number;
  startMouseY: number;
  startPoints: ChartPoint[];
  startEntry?: number;
  startSl?: number;
  startTp?: number;
}

export const TradingViewDrawingOverlay: React.FC<TradingViewDrawingOverlayProps> = ({
  chart,
  series,
  candles = [],
  width,
  height,
  activeTool,
  onToolUsed,
  drawings,
  onUpdateDrawings,
  selectedDrawingId,
  onSelectDrawing,
  isMagnetMode = false,
  isLocked = false,
  isDrawingLocked,
  isHidden = false,
  isDrawingHidden,
  onApplyPositionToOrder,
  symbol = 'XAUUSD'
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const effectiveLocked = isDrawingLocked ?? isLocked;
  const effectiveHidden = isDrawingHidden ?? isHidden;

  const containerRef = useRef<SVGSVGElement>(null);
  const [currentPoints, setCurrentPoints] = useState<ChartPoint[]>([]);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [snapPoint, setSnapPoint] = useState<{ x: number; y: number; price: number; time: number } | null>(null);
  const [, setTick] = useState(0);

  // Drag and Move state
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Subscribe to chart view change events to re-project coordinates on pan & zoom
  useEffect(() => {
    if (!chart) return;

    const handleRangeChange = () => {
      setTick(t => t + 1);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRangeChange);
    };
  }, [chart]);

  // Screen <-> Chart coordinate conversion
  const toScreen = useCallback((point: ChartPoint): { x: number; y: number } | null => {
    if (!chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(point.time as any);
    const y = series.priceToCoordinate(point.price);
    if (x === null || y === null || isNaN(x) || isNaN(y)) return null;
    return { x, y };
  }, [chart, series]);

  const toChart = useCallback((x: number, y: number): ChartPoint | null => {
    if (!chart || !series) return null;
    const time = chart.timeScale().coordinateToTime(x) as number | null;
    const price = series.coordinateToPrice(y);
    if (time === null || price === null || isNaN(price)) return null;
    return { time, price: parseFloat(price.toFixed(4)) };
  }, [chart, series]);

  // Magnet mode calculation: Snaps to nearest bar's Open, High, Low, or Close
  const calculateMagnetSnap = useCallback((mouseX: number, mouseY: number): { x: number; y: number; price: number; time: number } | null => {
    if (!isMagnetMode || !chart || !series || candles.length === 0) return null;

    const time = chart.timeScale().coordinateToTime(mouseX) as number | null;
    if (time === null) return null;

    // Find closest candle
    let closestCandle = candles[0];
    let minTimeDiff = Infinity;
    for (const c of candles) {
      const diff = Math.abs(c.time - time);
      if (diff < minTimeDiff) {
        minTimeDiff = diff;
        closestCandle = c;
      }
    }

    const candleX = chart.timeScale().timeToCoordinate(closestCandle.time as any);
    if (candleX === null) return null;

    const oY = series.priceToCoordinate(closestCandle.open);
    const hY = series.priceToCoordinate(closestCandle.high);
    const lY = series.priceToCoordinate(closestCandle.low);
    const cY = series.priceToCoordinate(closestCandle.close);

    const levels = [
      { y: hY, price: closestCandle.high },
      { y: lY, price: closestCandle.low },
      { y: oY, price: closestCandle.open },
      { y: cY, price: closestCandle.close }
    ].filter(lvl => lvl.y !== null) as { y: number; price: number }[];

    let closestLevel = levels[0];
    let minDist = Infinity;
    for (const lvl of levels) {
      const dist = Math.abs(lvl.y - mouseY);
      if (dist < minDist) {
        minDist = dist;
        closestLevel = lvl;
      }
    }

    if (minDist <= 32) {
      return { x: candleX, y: closestLevel.y, price: closestLevel.price, time: closestCandle.time };
    }
    return null;
  }, [isMagnetMode, chart, series, candles]);

  // Mouse Move Event
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverCoord({ x, y });

    if (isMagnetMode) {
      const snap = calculateMagnetSnap(x, y);
      setSnapPoint(snap);
    } else {
      setSnapPoint(null);
    }

    // Handle Dragging
    if (dragState) {
      const dx = x - dragState.startMouseX;
      const dy = y - dragState.startMouseY;

      const updated = drawings.map(d => {
        if (d.id !== dragState.drawingId) return d;

        if (dragState.mode === 'MOVE') {
          const newPoints = dragState.startPoints.map(p => {
            const screen = toScreen(p);
            if (!screen) return p;
            const newChart = toChart(screen.x + dx, screen.y + dy);
            return newChart || p;
          });
          return { ...d, points: newPoints };
        } else if (dragState.mode === 'POINT' && dragState.pointIndex !== undefined) {
          const p = dragState.startPoints[dragState.pointIndex];
          const screen = toScreen(p);
          if (!screen) return d;
          const newChart = toChart(screen.x + dx, screen.y + dy);
          if (!newChart) return d;

          const copy = [...d.points];
          copy[dragState.pointIndex] = newChart;
          return { ...d, points: copy };
        } else if (dragState.mode === 'POINT' && dragState.handleKey) {
          // Long/Short Position drag
          const currentChart = toChart(x, y);
          if (!currentChart) return d;

          if (dragState.handleKey === 'TP') {
            const entry = d.entryPrice || d.points[0]?.price || 0;
            const newTp = currentChart.price;
            const sl = d.stopLossPrice || entry;
            const rr = Math.abs(newTp - entry) / Math.max(0.0001, Math.abs(entry - sl));
            return { ...d, takeProfitPrice: newTp, riskRewardRatio: parseFloat(rr.toFixed(2)) };
          } else if (dragState.handleKey === 'SL') {
            const entry = d.entryPrice || d.points[0]?.price || 0;
            const newSl = currentChart.price;
            const tp = d.takeProfitPrice || entry;
            const rr = Math.abs(tp - entry) / Math.max(0.0001, Math.abs(entry - newSl));
            return { ...d, stopLossPrice: newSl, riskRewardRatio: parseFloat(rr.toFixed(2)) };
          }
        }
        return d;
      });

      onUpdateDrawings(updated);
    }
  };

  // Mouse Down Event: Tool placement & Selection
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (effectiveLocked) return;
    if (activeTool === 'cursor' || activeTool === 'crosshair') return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const targetX = snapPoint ? snapPoint.x : rawX;
    const targetY = snapPoint ? snapPoint.y : rawY;

    const chartPoint = snapPoint ? { time: snapPoint.time, price: snapPoint.price } : toChart(targetX, targetY);
    if (!chartPoint) return;

    // Single-point tools
    if (activeTool === 'horizontal_line' || activeTool === 'horizontal_ray' || activeTool === 'vertical_line' || activeTool === 'price_label') {
      const newDrawing: BacktestDrawing = {
        id: 'draw_' + Date.now(),
        type: activeTool,
        points: [chartPoint],
        color: activeTool === 'horizontal_line' ? '#2563eb' : activeTool === 'horizontal_ray' ? '#38bdf8' : '#f59e0b',
        lineWidth: 1.5,
        lineStyle: 'solid'
      };
      onUpdateDrawings([...drawings, newDrawing]);
      onToolUsed();
      return;
    }

    // Long & Short Position Tool (One-click default box placement)
    if (activeTool === 'long_position' || activeTool === 'short_position') {
      const isLong = activeTool === 'long_position';
      const offset = chartPoint.price * 0.005; // 0.5% default target / stop
      const sl = isLong ? chartPoint.price - offset : chartPoint.price + offset;
      const tp = isLong ? chartPoint.price + (offset * 2) : chartPoint.price - (offset * 2);

      const newDrawing: BacktestDrawing = {
        id: 'draw_' + Date.now(),
        type: activeTool,
        points: [chartPoint],
        color: isLong ? '#10b981' : '#f43f5e',
        entryPrice: chartPoint.price,
        stopLossPrice: parseFloat(sl.toFixed(4)),
        takeProfitPrice: parseFloat(tp.toFixed(4)),
        riskRewardRatio: 2.0
      };
      onUpdateDrawings([...drawings, newDrawing]);
      onToolUsed();
      return;
    }

    // Multi-point tools: Trendline, Fib, Rectangle, Circle, Measure
    if (currentPoints.length === 0) {
      setCurrentPoints([chartPoint]);
    } else {
      const finalPoints = [...currentPoints, chartPoint];
      const newDrawing: BacktestDrawing = {
        id: 'draw_' + Date.now(),
        type: activeTool,
        points: finalPoints,
        color: activeTool === 'fib_retracement' ? '#f59e0b' : activeTool === 'rectangle' ? '#10b981' : '#2962ff',
        fillColor: activeTool === 'rectangle' ? 'rgba(16, 185, 129, 0.12)' : undefined,
        lineWidth: 1.5,
        lineStyle: 'solid'
      };
      onUpdateDrawings([...drawings, newDrawing]);
      setCurrentPoints([]);
      onToolUsed();
    }
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  if (isHidden) return null;

  // Selected Drawing helper
  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId);
  const selectedDrawingCenter = selectedDrawing?.points[0] ? toScreen(selectedDrawing.points[0]) : null;

  return (
    <svg
      ref={containerRef}
      className={`absolute inset-0 z-20 select-none overflow-visible ${
        activeTool !== 'cursor' && activeTool !== 'crosshair'
          ? 'cursor-crosshair pointer-events-auto'
          : 'pointer-events-auto'
      }`}
      style={{ width, height }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          onSelectDrawing(null);
        }
      }}
    >
      {/* Magnetic Snapping Indicator Dot */}
      {snapPoint && (
        <g transform={`translate(${snapPoint.x}, ${snapPoint.y})`} className="pointer-events-none">
          <circle cx={0} cy={0} r={6} fill="#2962ff" fillOpacity={0.25} />
          <circle cx={0} cy={0} r={3} fill="#2962ff" stroke="#ffffff" strokeWidth={1.5} />
        </g>
      )}

      {/* Render All Completed Drawings */}
      {!effectiveHidden && drawings.map(d => {
        const isSelected = d.id === selectedDrawingId;

        // 1. Horizontal Line / Ray
        if (d.type === 'horizontal_line' || d.type === 'horizontal_ray') {
          const pt = d.points[0];
          const sc = pt ? toScreen(pt) : null;
          if (!sc) return null;

          const startX = d.type === 'horizontal_line' ? 0 : sc.x;

          return (
            <g
              key={d.id}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
              <line
                x1={startX}
                y1={sc.y}
                x2={width - 65}
                y2={sc.y}
                stroke="transparent"
                strokeWidth={14}
              />
              <line
                x1={startX}
                y1={sc.y}
                x2={width - 65}
                y2={sc.y}
                stroke={d.color || '#2563eb'}
                strokeWidth={isSelected ? (d.lineWidth || 1.5) + 1 : (d.lineWidth || 1.5)}
                strokeDasharray={d.lineStyle === 'dashed' ? '5 4' : undefined}
                className="group-hover:opacity-80 transition-opacity"
              />
              {isSelected && (
                <circle
                  cx={sc.x}
                  cy={sc.y}
                  r={4.5}
                  fill="#2962ff"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({
                      drawingId: d.id,
                      mode: 'MOVE',
                      startMouseX: e.clientX,
                      startMouseY: e.clientY,
                      startPoints: d.points
                    });
                  }}
                />
              )}
            </g>
          );
        }

        // 2. Trendline & Ray
        if (d.type === 'trendline' || d.type === 'ray') {
          if (d.points.length < 2) return null;
          const p1 = toScreen(d.points[0]);
          const p2 = toScreen(d.points[1]);
          if (!p1 || !p2) return null;

          return (
            <g
              key={d.id}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={16} />
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={d.color || '#2962ff'}
                strokeWidth={isSelected ? (d.lineWidth || 1.5) + 1 : (d.lineWidth || 1.5)}
              />
              {isSelected && (
                <>
                  <circle
                    cx={p1.x}
                    cy={p1.y}
                    r={4.5}
                    fill="#2962ff"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({
                        drawingId: d.id,
                        mode: 'POINT',
                        pointIndex: 0,
                        startMouseX: e.clientX,
                        startMouseY: e.clientY,
                        startPoints: d.points
                      });
                    }}
                  />
                  <circle
                    cx={p2.x}
                    cy={p2.y}
                    r={4.5}
                    fill="#2962ff"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({
                        drawingId: d.id,
                        mode: 'POINT',
                        pointIndex: 1,
                        startMouseX: e.clientX,
                        startMouseY: e.clientY,
                        startPoints: d.points
                      });
                    }}
                  />
                </>
              )}
            </g>
          );
        }

        // 3. Fibonacci Retracement (Exact TradingView Levels & Colors)
        if (d.type === 'fib_retracement') {
          if (d.points.length < 2) return null;
          const p1 = toScreen(d.points[0]);
          const p2 = toScreen(d.points[1]);
          if (!p1 || !p2) return null;

          const highPrice = Math.max(d.points[0].price, d.points[1].price);
          const lowPrice = Math.min(d.points[0].price, d.points[1].price);
          const diff = highPrice - lowPrice;

          const fibRatios = [
            { level: 0, color: '#787b86', bg: 'rgba(120, 123, 134, 0.08)' },
            { level: 0.236, color: '#f23645', bg: 'rgba(242, 54, 69, 0.12)' },
            { level: 0.382, color: '#ff9800', bg: 'rgba(255, 152, 0, 0.12)' },
            { level: 0.5, color: '#4caf50', bg: 'rgba(76, 175, 80, 0.12)' },
            { level: 0.618, color: '#089981', bg: 'rgba(8, 153, 129, 0.16)' },
            { level: 0.786, color: '#2962ff', bg: 'rgba(41, 98, 255, 0.12)' },
            { level: 1.0, color: '#787b86', bg: 'rgba(120, 123, 134, 0.08)' }
          ];

          const minX = Math.min(p1.x, p2.x);
          const maxX = Math.max(p1.x, p2.x, minX + 240);

          return (
            <g
              key={d.id}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
              {fibRatios.map((fib, idx) => {
                const targetPrice = highPrice - (diff * fib.level);
                const targetY = series?.priceToCoordinate(targetPrice);
                if (targetY === null || targetY === undefined) return null;

                return (
                  <g key={fib.level}>
                    <line
                      x1={minX}
                      y1={targetY}
                      x2={maxX}
                      y2={targetY}
                      stroke={fib.color}
                      strokeWidth={1}
                      strokeDasharray={fib.level === 0.5 ? 'none' : '4 3'}
                    />
                    <text
                      x={minX + 6}
                      y={targetY - 3}
                      fill={fib.color}
                      fontSize={10}
                      fontFamily="Arial, sans-serif"
                      fontWeight="bold"
                    >
                      {fib.level} ({targetPrice.toFixed(2)})
                    </text>
                  </g>
                );
              })}
            </g>
          );
        }

        // 4. Rectangle (Order Block / FVG Zone)
        if (d.type === 'rectangle') {
          if (d.points.length < 2) return null;
          const p1 = toScreen(d.points[0]);
          const p2 = toScreen(d.points[1]);
          if (!p1 || !p2) return null;

          const rx = Math.min(p1.x, p2.x);
          const ry = Math.min(p1.y, p2.y);
          const rw = Math.abs(p1.x - p2.x);
          const rh = Math.abs(p1.y - p2.y);

          return (
            <g
              key={d.id}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
              <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                fill={d.fillColor || 'rgba(16, 185, 129, 0.12)'}
                stroke={d.color || '#10b981'}
                strokeWidth={isSelected ? 2 : 1}
                rx={2}
              />
              {isSelected && (
                <>
                  <circle cx={p1.x} cy={p1.y} r={4.5} fill="#2962ff" stroke="#fff" strokeWidth={1.5} />
                  <circle cx={p2.x} cy={p2.y} r={4.5} fill="#2962ff" stroke="#fff" strokeWidth={1.5} />
                </>
              )}
            </g>
          );
        }

        // 5. Long / Short Position Tool (Exact TradingView Pro Box)
        if (d.type === 'long_position' || d.type === 'short_position') {
          const isLong = d.type === 'long_position';
          const p = d.points[0];
          const sc = p ? toScreen(p) : null;
          if (!sc) return null;

          const entry = d.entryPrice || p.price;
          const sl = d.stopLossPrice || (isLong ? entry * 0.995 : entry * 1.005);
          const tp = d.takeProfitPrice || (isLong ? entry * 1.01 : entry * 0.99);

          const entryCoordY = series?.priceToCoordinate(entry) || sc.y;
          const slCoordY = series?.priceToCoordinate(sl) || (isLong ? sc.y + 40 : sc.y - 40);
          const tpCoordY = series?.priceToCoordinate(tp) || (isLong ? sc.y - 70 : sc.y + 70);

          const boxWidth = 140;
          const boxLeft = sc.x;

          const profitBoxY = Math.min(entryCoordY, tpCoordY);
          const profitBoxH = Math.abs(entryCoordY - tpCoordY);

          const lossBoxY = Math.min(entryCoordY, slCoordY);
          const lossBoxH = Math.abs(entryCoordY - slCoordY);

          const rr = (Math.abs(tp - entry) / Math.max(0.0001, Math.abs(entry - sl))).toFixed(2);

          return (
            <g
              key={d.id}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
              {/* Profit Target Box (Green) */}
              <rect
                x={boxLeft}
                y={profitBoxY}
                width={boxWidth}
                height={profitBoxH}
                fill="rgba(16, 185, 129, 0.18)"
                stroke="#10b981"
                strokeWidth={1}
              />
              <text x={boxLeft + 8} y={profitBoxY + 16} fill="#10b981" fontSize={10} fontWeight="bold">
                TP: {tp.toFixed(2)}
              </text>

              {/* Loss Stop Box (Red) */}
              <rect
                x={boxLeft}
                y={lossBoxY}
                width={boxWidth}
                height={lossBoxH}
                fill="rgba(244, 63, 94, 0.18)"
                stroke="#f43f5e"
                strokeWidth={1}
              />
              <text x={boxLeft + 8} y={lossBoxY + lossBoxH - 8} fill="#f43f5e" fontSize={10} fontWeight="bold">
                SL: {sl.toFixed(2)}
              </text>

              {/* Center Risk/Reward Badge */}
              <g transform={`translate(${boxLeft + boxWidth / 2}, ${entryCoordY - 11})`}>
                <rect x={-45} y={0} width={90} height={22} rx={11} fill="#0f172a" stroke="#2563eb" strokeWidth={1} />
                <text x={0} y={15} fill="#ffffff" fontSize={10} fontWeight="black" textAnchor="middle">
                  R:R {rr}
                </text>
              </g>

              {/* Drag handles for TP and SL */}
              {isSelected && (
                <>
                  <circle
                    cx={boxLeft + boxWidth}
                    cy={tpCoordY}
                    r={5}
                    fill="#10b981"
                    stroke="#fff"
                    strokeWidth={1.5}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({
                        drawingId: d.id,
                        mode: 'POINT',
                        handleKey: 'TP',
                        startMouseX: e.clientX,
                        startMouseY: e.clientY,
                        startPoints: d.points
                      });
                    }}
                  />
                  <circle
                    cx={boxLeft + boxWidth}
                    cy={slCoordY}
                    r={5}
                    fill="#f43f5e"
                    stroke="#fff"
                    strokeWidth={1.5}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({
                        drawingId: d.id,
                        mode: 'POINT',
                        handleKey: 'SL',
                        startMouseX: e.clientX,
                        startMouseY: e.clientY,
                        startPoints: d.points
                      });
                    }}
                  />
                </>
              )}
            </g>
          );
        }

        return null;
      })}

      {/* Rubber-band Drafting Preview when drawing multi-point tools */}
      {currentPoints.length > 0 && hoverCoord && (
        <g className="pointer-events-none opacity-70">
          {(() => {
            const startScreen = toScreen(currentPoints[0]);
            if (!startScreen) return null;
            const endX = snapPoint ? snapPoint.x : hoverCoord.x;
            const endY = snapPoint ? snapPoint.y : hoverCoord.y;

            if (activeTool === 'trendline' || activeTool === 'fib_retracement') {
              return (
                <line
                  x1={startScreen.x}
                  y1={startScreen.y}
                  x2={endX}
                  y2={endY}
                  stroke="#2962ff"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              );
            }
            if (activeTool === 'rectangle') {
              return (
                <rect
                  x={Math.min(startScreen.x, endX)}
                  y={Math.min(startScreen.y, endY)}
                  width={Math.abs(startScreen.x - endX)}
                  height={Math.abs(startScreen.y - endY)}
                  fill="rgba(41, 98, 255, 0.1)"
                  stroke="#2962ff"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              );
            }
            return null;
          })()}
        </g>
      )}

      {/* Floating Styling Toolbar on Selected Drawing */}
      {selectedDrawing && selectedDrawingCenter && (
        <g
          transform={`translate(${Math.max(10, Math.min(width - 180, selectedDrawingCenter.x - 70))}, ${Math.max(10, selectedDrawingCenter.y - 45)})`}
          className="pointer-events-auto select-none"
        >
          <rect
            x={0}
            y={0}
            width={140}
            height={32}
            rx={8}
            fill={isDark ? '#0b0c10' : '#ffffff'}
            stroke={isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}
            strokeWidth={1}
            className="drop-shadow-xl"
          />
          {/* Quick Color Pickers */}
          {['#2962ff', '#10b981', '#f59e0b', '#f43f5e'].map((c, i) => (
            <circle
              key={c}
              cx={18 + (i * 22)}
              cy={16}
              r={7}
              fill={c}
              className="cursor-pointer hover:scale-110 transition-transform"
              onClick={() => {
                const updated = drawings.map(d => d.id === selectedDrawing.id ? { ...d, color: c } : d);
                onUpdateDrawings(updated);
              }}
            />
          ))}

          {/* Delete Button */}
          <g
            transform="translate(115, 8)"
            className="cursor-pointer text-muted hover:text-rose-500"
            onClick={() => {
              onUpdateDrawings(drawings.filter(d => d.id !== selectedDrawing.id));
              onSelectDrawing(null);
            }}
          >
            <rect x={-2} y={-2} width={20} height={20} fill="transparent" />
            <path
              d="M3 6h12M5 6v10a2 2 0 002 2h4a2 2 0 002-2V6M8 6V4a1 1 0 011-1h0a1 1 0 011 1v2"
              stroke="#f43f5e"
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>
      )}
    </svg>
  );
};
