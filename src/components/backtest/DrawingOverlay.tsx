import React, { useRef, useEffect, useState, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { BacktestDrawing, DrawingType, ChartPoint } from '../../types/backtest';

interface DrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  width: number;
  height: number;
  activeTool: DrawingType;
  onToolUsed: () => void;
  drawings: BacktestDrawing[];
  onUpdateDrawings: (drawings: BacktestDrawing[]) => void;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  onApplyPositionToOrder?: (entry: number, sl: number, tp: number, side: 'BUY' | 'SELL') => void;
}

interface DragState {
  drawingId: string;
  mode: 'TRANSLATE' | 'HANDLE';
  handleKey?: string | number; // 'TP' | 'SL' | 'ENTRY' or point index 0, 1, etc.
  startMouseX: number;
  startMouseY: number;
  startChartPoint: ChartPoint;
  startPoints: ChartPoint[];
  startEntry?: number;
  startSl?: number;
  startTp?: number;
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  chart,
  series,
  width,
  height,
  activeTool,
  onToolUsed,
  drawings,
  onUpdateDrawings,
  selectedDrawingId,
  onSelectDrawing,
  onApplyPositionToOrder
}) => {
  const containerRef = useRef<SVGSVGElement>(null);
  const [currentPoints, setCurrentPoints] = useState<ChartPoint[]>([]);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [, setTick] = useState(0); // Re-project coordinates on chart pan/zoom

  // Drag and Move State for drawings (Item 3)
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Subscribe to chart view change events to re-project coordinates
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

  // Coordinate Conversion Helpers
  const toScreen = useCallback((point: ChartPoint): { x: number; y: number } | null => {
    if (!chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(point.time as any);
    const y = series.priceToCoordinate(point.price);
    if (x === null || y === null) return null;
    return { x, y };
  }, [chart, series]);

  const toChart = useCallback((x: number, y: number): ChartPoint | null => {
    if (!chart || !series) return null;
    const time = chart.timeScale().coordinateToTime(x) as number | null;
    const price = series.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time, price: parseFloat(price.toFixed(4)) };
  }, [chart, series]);

  // Handle Mouse Events for drawing creation
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartPoint = toChart(x, y);
    if (!chartPoint) return;

    if (activeTool === 'horizontal_ray') {
      const newDrawing: BacktestDrawing = {
        id: 'draw_' + Date.now(),
        type: 'horizontal_ray',
        points: [chartPoint],
        color: '#38bdf8',
        label: `Level: ${chartPoint.price}`
      };
      onUpdateDrawings([...drawings, newDrawing]);
      onSelectDrawing(newDrawing.id);
      onToolUsed();
      return;
    }

    if (activeTool === 'long_position' || activeTool === 'short_position') {
      const isLong = activeTool === 'long_position';
      const offset = chartPoint.price * 0.008;
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
      onSelectDrawing(newDrawing.id);
      if (onApplyPositionToOrder) {
        onApplyPositionToOrder(chartPoint.price, newDrawing.stopLossPrice!, newDrawing.takeProfitPrice!, isLong ? 'BUY' : 'SELL');
      }
      onToolUsed();
      return;
    }

    // Two-point tools: trendline, rectangle, measure
    if (currentPoints.length === 0) {
      setCurrentPoints([chartPoint]);
    } else {
      const p1 = currentPoints[0];
      const p2 = chartPoint;

      const newDrawing: BacktestDrawing = {
        id: 'draw_' + Date.now(),
        type: activeTool,
        points: [p1, p2],
        color: activeTool === 'rectangle' ? '#8b5cf6' : activeTool === 'measure' ? '#fbbf24' : '#60a5fa'
      };

      onUpdateDrawings([...drawings, newDrawing]);
      onSelectDrawing(newDrawing.id);
      setCurrentPoints([]);
      onToolUsed();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverCoord({ x, y });
  };

  // --- TRADINGVIEW-GRADE MOVE & RESIZE DRAG ENGINE (Item 3) ---

  const handleStartTranslate = (d: BacktestDrawing) => (e: React.PointerEvent) => {
    if (activeTool !== 'cursor') return;
    e.stopPropagation();
    e.preventDefault();

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startPoint = toChart(e.clientX - rect.left, e.clientY - rect.top);
    if (!startPoint) return;

    onSelectDrawing(d.id);
    setDragState({
      drawingId: d.id,
      mode: 'TRANSLATE',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startChartPoint: startPoint,
      startPoints: d.points.map(p => ({ ...p })),
      startEntry: d.entryPrice,
      startSl: d.stopLossPrice,
      startTp: d.takeProfitPrice
    });
  };

  const handleStartResize = (d: BacktestDrawing, handleKey: string | number) => (e: React.PointerEvent) => {
    if (activeTool !== 'cursor') return;
    e.stopPropagation();
    e.preventDefault();

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startPoint = toChart(e.clientX - rect.left, e.clientY - rect.top);
    if (!startPoint) return;

    onSelectDrawing(d.id);
    setDragState({
      drawingId: d.id,
      mode: 'HANDLE',
      handleKey,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startChartPoint: startPoint,
      startPoints: d.points.map(p => ({ ...p })),
      startEntry: d.entryPrice,
      startSl: d.stopLossPrice,
      startTp: d.takeProfitPrice
    });
  };

  // Window-level event listener ensures smooth dragging without losing tracking even when moving fast
  useEffect(() => {
    if (!dragState) return;

    const onWindowPointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !series || !chart) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const currentPoint = toChart(currentX, currentY);
      if (!currentPoint) return;

      const drawing = drawings.find(d => d.id === dragState.drawingId);
      if (!drawing) return;

      if (dragState.mode === 'TRANSLATE') {
        const deltaTime = currentPoint.time - dragState.startChartPoint.time;
        const deltaPrice = currentPoint.price - dragState.startChartPoint.price;

        const updatedPoints = dragState.startPoints.map(p => ({
          time: p.time + deltaTime,
          price: parseFloat((p.price + deltaPrice).toFixed(4))
        }));

        const updatedDrawing: BacktestDrawing = {
          ...drawing,
          points: updatedPoints
        };

        if (drawing.type === 'long_position' || drawing.type === 'short_position') {
          if (dragState.startEntry !== undefined) {
            updatedDrawing.entryPrice = parseFloat((dragState.startEntry + deltaPrice).toFixed(4));
          }
          if (dragState.startSl !== undefined) {
            updatedDrawing.stopLossPrice = parseFloat((dragState.startSl + deltaPrice).toFixed(4));
          }
          if (dragState.startTp !== undefined) {
            updatedDrawing.takeProfitPrice = parseFloat((dragState.startTp + deltaPrice).toFixed(4));
          }

          if (onApplyPositionToOrder && updatedDrawing.entryPrice && updatedDrawing.stopLossPrice && updatedDrawing.takeProfitPrice) {
            onApplyPositionToOrder(
              updatedDrawing.entryPrice,
              updatedDrawing.stopLossPrice,
              updatedDrawing.takeProfitPrice,
              drawing.type === 'long_position' ? 'BUY' : 'SELL'
            );
          }
        }

        onUpdateDrawings(drawings.map(d => d.id === drawing.id ? updatedDrawing : d));
      } else if (dragState.mode === 'HANDLE') {
        const updatedDrawing = { ...drawing };

        if (typeof dragState.handleKey === 'number') {
          const idx = dragState.handleKey;
          const newPoints = [...drawing.points];
          newPoints[idx] = currentPoint;
          updatedDrawing.points = newPoints;
          onUpdateDrawings(drawings.map(d => d.id === drawing.id ? updatedDrawing : d));
        } else if (dragState.handleKey === 'TP') {
          updatedDrawing.takeProfitPrice = currentPoint.price;
          const isLong = drawing.type === 'long_position';
          const entry = drawing.entryPrice || drawing.points[0]?.price || currentPoint.price;
          const sl = drawing.stopLossPrice || entry * (isLong ? 0.99 : 1.01);
          const riskDist = Math.abs(entry - sl);
          const rewardDist = Math.abs(currentPoint.price - entry);
          updatedDrawing.riskRewardRatio = riskDist > 0 ? parseFloat((rewardDist / riskDist).toFixed(2)) : 1;

          if (onApplyPositionToOrder && updatedDrawing.entryPrice && updatedDrawing.stopLossPrice) {
            onApplyPositionToOrder(entry, sl, currentPoint.price, isLong ? 'BUY' : 'SELL');
          }
          onUpdateDrawings(drawings.map(d => d.id === drawing.id ? updatedDrawing : d));
        } else if (dragState.handleKey === 'SL') {
          updatedDrawing.stopLossPrice = currentPoint.price;
          const isLong = drawing.type === 'long_position';
          const entry = drawing.entryPrice || drawing.points[0]?.price || currentPoint.price;
          const tp = drawing.takeProfitPrice || entry * (isLong ? 1.02 : 0.98);
          const riskDist = Math.abs(entry - currentPoint.price);
          const rewardDist = Math.abs(tp - entry);
          updatedDrawing.riskRewardRatio = riskDist > 0 ? parseFloat((rewardDist / riskDist).toFixed(2)) : 1;

          if (onApplyPositionToOrder && updatedDrawing.entryPrice && updatedDrawing.takeProfitPrice) {
            onApplyPositionToOrder(entry, currentPoint.price, tp, isLong ? 'BUY' : 'SELL');
          }
          onUpdateDrawings(drawings.map(d => d.id === drawing.id ? updatedDrawing : d));
        } else if (dragState.handleKey === 'ENTRY') {
          const deltaPrice = currentPoint.price - (drawing.entryPrice || drawing.points[0]?.price || currentPoint.price);
          updatedDrawing.entryPrice = currentPoint.price;
          if (updatedDrawing.stopLossPrice) updatedDrawing.stopLossPrice += deltaPrice;
          if (updatedDrawing.takeProfitPrice) updatedDrawing.takeProfitPrice += deltaPrice;
          updatedDrawing.points = [{ ...drawing.points[0], price: currentPoint.price }];

          if (onApplyPositionToOrder && updatedDrawing.stopLossPrice && updatedDrawing.takeProfitPrice) {
            onApplyPositionToOrder(currentPoint.price, updatedDrawing.stopLossPrice, updatedDrawing.takeProfitPrice, drawing.type === 'long_position' ? 'BUY' : 'SELL');
          }
          onUpdateDrawings(drawings.map(d => d.id === drawing.id ? updatedDrawing : d));
        }
      }
    };

    const onWindowPointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
    };
  }, [dragState, drawings, series, chart, toChart, onApplyPositionToOrder, onUpdateDrawings]);

  // Keyboard shortcut to delete selected drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
        onUpdateDrawings(drawings.filter(d => d.id !== selectedDrawingId));
        onSelectDrawing(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, drawings, onUpdateDrawings, onSelectDrawing]);

  return (
    <svg
      ref={containerRef}
      className={`absolute inset-0 z-10 ${
        activeTool !== 'cursor'
          ? 'cursor-crosshair'
          : dragState
          ? 'cursor-grabbing'
          : 'cursor-default pointer-events-none'
      }`}
      style={{
        width,
        height,
        pointerEvents: activeTool !== 'cursor' || dragState !== null ? 'auto' : 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      {/* Render Saved Drawings */}
      {drawings.map(d => {
        const isSelected = d.id === selectedDrawingId;

        // 1. Horizontal Ray / S&R Level
        if (d.type === 'horizontal_ray' && d.points.length >= 1) {
          const pt = toScreen(d.points[0]);
          if (!pt) return null;
          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-grab active:cursor-grabbing group"
              onPointerDown={handleStartTranslate(d)}
            >
              {/* Wide Invisible Grab Zone */}
              <line x1={0} y1={pt.y} x2={width} y2={pt.y} stroke="transparent" strokeWidth={24} />

              <line
                x1={0}
                y1={pt.y}
                x2={width}
                y2={pt.y}
                stroke={d.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray="4 3"
              />
              <rect
                x={width - 95}
                y={pt.y - 10}
                width={85}
                height={20}
                rx={4}
                fill="#0f172a"
                stroke={d.color}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text
                x={width - 52}
                y={pt.y + 3.5}
                fill={d.color}
                fontSize={10}
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                {d.points[0].price}
              </text>
            </g>
          );
        }

        // 2. Trendline (Moveable body + 2 Endpoint control handles)
        if (d.type === 'trendline' && d.points.length >= 2) {
          const pt1 = toScreen(d.points[0]);
          const pt2 = toScreen(d.points[1]);
          if (!pt1 || !pt2) return null;

          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-grab active:cursor-grabbing"
              onPointerDown={handleStartTranslate(d)}
            >
              {/* Invisible wide grab zone along the line */}
              <line x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y} stroke="transparent" strokeWidth={24} />

              <line
                x1={pt1.x}
                y1={pt1.y}
                x2={pt2.x}
                y2={pt2.y}
                stroke={d.color}
                strokeWidth={isSelected ? 3 : 2}
              />

              {/* Endpoint 1 Resizing Handle */}
              <circle
                cx={pt1.x}
                cy={pt1.y}
                r={isSelected ? 6 : 4}
                fill={isSelected ? '#ffffff' : d.color}
                stroke={d.color}
                strokeWidth={2}
                className="cursor-crosshair active:scale-125"
                onPointerDown={handleStartResize(d, 0)}
              />

              {/* Endpoint 2 Resizing Handle */}
              <circle
                cx={pt2.x}
                cy={pt2.y}
                r={isSelected ? 6 : 4}
                fill={isSelected ? '#ffffff' : d.color}
                stroke={d.color}
                strokeWidth={2}
                className="cursor-crosshair active:scale-125"
                onPointerDown={handleStartResize(d, 1)}
              />
            </g>
          );
        }

        // 3. Rectangle / Zone Box (Moveable body + 4 Corner control handles)
        if (d.type === 'rectangle' && d.points.length >= 2) {
          const pt1 = toScreen(d.points[0]);
          const pt2 = toScreen(d.points[1]);
          if (!pt1 || !pt2) return null;

          const x = Math.min(pt1.x, pt2.x);
          const y = Math.min(pt1.y, pt2.y);
          const rectW = Math.max(8, Math.abs(pt2.x - pt1.x));
          const rectH = Math.max(8, Math.abs(pt2.y - pt1.y));

          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-move active:cursor-grabbing"
              onPointerDown={handleStartTranslate(d)}
            >
              <rect
                x={x}
                y={y}
                width={rectW}
                height={rectH}
                fill="rgba(139, 92, 246, 0.18)"
                stroke={d.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                rx={2}
              />

              {/* 4 Corner Control Handles when Selected */}
              {isSelected && (
                <>
                  <circle
                    cx={pt1.x}
                    cy={pt1.y}
                    r={5}
                    fill="#ffffff"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    className="cursor-nwse-resize"
                    onPointerDown={handleStartResize(d, 0)}
                  />
                  <circle
                    cx={pt2.x}
                    cy={pt2.y}
                    r={5}
                    fill="#ffffff"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    className="cursor-nwse-resize"
                    onPointerDown={handleStartResize(d, 1)}
                  />
                </>
              )}
            </g>
          );
        }

        // 4. Long / Short Position Tools (Moveable body + TP/SL/Entry drag handles - Image 3)
        if ((d.type === 'long_position' || d.type === 'short_position') && d.points.length >= 1) {
          const pt = toScreen(d.points[0]);
          if (!pt || !series) return null;

          const isLong = d.type === 'long_position';
          const entryPrice = d.entryPrice || d.points[0].price;
          const slPrice = d.stopLossPrice || (isLong ? entryPrice * 0.99 : entryPrice * 1.01);
          const tpPrice = d.takeProfitPrice || (isLong ? entryPrice * 1.02 : entryPrice * 0.98);

          const entryY = series.priceToCoordinate(entryPrice) ?? pt.y;
          const slY = series.priceToCoordinate(slPrice) ?? (isLong ? pt.y + 40 : pt.y - 40);
          const tpY = series.priceToCoordinate(tpPrice) ?? (isLong ? pt.y - 80 : pt.y + 80);

          const boxWidth = 160;
          const boxLeft = Math.max(10, pt.x - 30);

          const targetY = isLong ? tpY : entryY;
          const targetH = Math.max(4, Math.abs(tpY - entryY));

          const riskY = isLong ? entryY : slY;
          const riskH = Math.max(4, Math.abs(slY - entryY));

          const riskDist = Math.abs(entryPrice - slPrice);
          const targetDist = Math.abs(tpPrice - entryPrice);
          const rr = riskDist > 0 ? (targetDist / riskDist).toFixed(2) : '0';

          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-move active:cursor-grabbing select-none"
              onPointerDown={handleStartTranslate(d)}
            >
              {/* Target Green Zone Box */}
              <rect
                x={boxLeft}
                y={targetY}
                width={boxWidth}
                height={targetH}
                fill="rgba(16, 185, 129, 0.24)"
                stroke="#10b981"
                strokeWidth={isSelected ? 2 : 1.5}
              />

              <text
                x={boxLeft + 8}
                y={targetY + 16}
                fill="#34d399"
                fontSize={10}
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
              >
                TP: {tpPrice.toFixed(2)} (R:R {rr})
              </text>

              {/* Target Edge Drag Handle */}
              <g
                className="cursor-ns-resize"
                onPointerDown={handleStartResize(d, 'TP')}
              >
                <line
                  x1={boxLeft}
                  y1={tpY}
                  x2={boxLeft + boxWidth}
                  y2={tpY}
                  stroke="#10b981"
                  strokeWidth={4}
                />
                <circle cx={boxLeft + boxWidth / 2} cy={tpY} r={5} fill="#ffffff" stroke="#10b981" strokeWidth={2} />
              </g>

              {/* Risk Red Zone Box */}
              <rect
                x={boxLeft}
                y={riskY}
                width={boxWidth}
                height={riskH}
                fill="rgba(244, 63, 94, 0.24)"
                stroke="#f43f5e"
                strokeWidth={isSelected ? 2 : 1.5}
              />

              <text
                x={boxLeft + 8}
                y={riskY + Math.min(riskH - 6, 20)}
                fill="#fb7185"
                fontSize={10}
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
              >
                SL: {slPrice.toFixed(2)}
              </text>

              {/* Stop Loss Edge Drag Handle */}
              <g
                className="cursor-ns-resize"
                onPointerDown={handleStartResize(d, 'SL')}
              >
                <line
                  x1={boxLeft}
                  y1={slY}
                  x2={boxLeft + boxWidth}
                  y2={slY}
                  stroke="#f43f5e"
                  strokeWidth={4}
                />
                <circle cx={boxLeft + boxWidth / 2} cy={slY} r={5} fill="#ffffff" stroke="#f43f5e" strokeWidth={2} />
              </g>

              {/* Entry Line & Middle Drag Handle */}
              <g
                className="cursor-ns-resize"
                onPointerDown={handleStartResize(d, 'ENTRY')}
              >
                <line
                  x1={boxLeft}
                  y1={entryY}
                  x2={boxLeft + boxWidth}
                  y2={entryY}
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
                <circle cx={boxLeft + boxWidth / 2} cy={entryY} r={4} fill="#ffffff" stroke="#64748b" strokeWidth={1.5} />
                <text
                  x={boxLeft + 8}
                  y={entryY - 4}
                  fill="#cbd5e1"
                  fontSize={9}
                  fontFamily="Arial, sans-serif"
                >
                  Entry: {entryPrice.toFixed(2)}
                </text>
              </g>
            </g>
          );
        }

        // 5. Measure Tool
        if (d.type === 'measure' && d.points.length >= 2) {
          const pt1 = toScreen(d.points[0]);
          const pt2 = toScreen(d.points[1]);
          if (!pt1 || !pt2) return null;

          const pDiff = Math.abs(d.points[1].price - d.points[0].price);
          const pPct = ((pDiff / d.points[0].price) * 100).toFixed(2);

          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-move active:cursor-grabbing"
              onPointerDown={handleStartTranslate(d)}
            >
              <line
                x1={pt1.x}
                y1={pt1.y}
                x2={pt2.x}
                y2={pt2.y}
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              <rect
                x={Math.min(pt1.x, pt2.x)}
                y={Math.min(pt1.y, pt2.y) - 22}
                width={110}
                height={20}
                rx={4}
                fill="#0f172a"
                stroke="#fbbf24"
                strokeWidth={1}
              />
              <text
                x={Math.min(pt1.x, pt2.x) + 55}
                y={Math.min(pt1.y, pt2.y) - 8}
                fill="#fde047"
                fontSize={10}
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
                textAnchor="middle"
              >
                {pDiff.toFixed(2)} ({pPct}%)
              </text>
            </g>
          );
        }

        return null;
      })}

      {/* Temporary In-Progress Drawing Preview */}
      {currentPoints.length === 1 && hoverCoord && (
        <>
          {activeTool === 'trendline' && (
            <line
              x1={toScreen(currentPoints[0])?.x || 0}
              y1={toScreen(currentPoints[0])?.y || 0}
              x2={hoverCoord.x}
              y2={hoverCoord.y}
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          )}
          {activeTool === 'rectangle' && (
            <rect
              x={Math.min(toScreen(currentPoints[0])?.x || 0, hoverCoord.x)}
              y={Math.min(toScreen(currentPoints[0])?.y || 0, hoverCoord.y)}
              width={Math.abs(hoverCoord.x - (toScreen(currentPoints[0])?.x || 0))}
              height={Math.abs(hoverCoord.y - (toScreen(currentPoints[0])?.y || 0))}
              fill="rgba(139, 92, 246, 0.15)"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}
          {activeTool === 'measure' && (
            <line
              x1={toScreen(currentPoints[0])?.x || 0}
              y1={toScreen(currentPoints[0])?.y || 0}
              x2={hoverCoord.x}
              y2={hoverCoord.y}
              stroke="#fbbf24"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          )}
        </>
      )}
    </svg>
  );
};
