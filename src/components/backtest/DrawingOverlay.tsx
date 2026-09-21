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
  const [, setTick] = useState(0); // Trigger re-render on chart pan/zoom

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
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'cursor') {
      return;
    }

    const chartPoint = toChart(x, y);
    if (!chartPoint) return;

    if (activeTool === 'horizontal_ray') {
      // Single click creation
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
      // Create with smart SL & TP offsets
      const isLong = activeTool === 'long_position';
      const offset = chartPoint.price * 0.008; // 0.8% default risk distance
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

  // Keyboard shortcut to delete selected drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        // Only if not focusing an input or textarea
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
        activeTool !== 'cursor' ? 'cursor-crosshair' : 'cursor-default pointer-events-none'
      }`}
      style={{ width, height, pointerEvents: activeTool !== 'cursor' ? 'auto' : 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Render Saved Drawings */}
      {drawings.map(d => {
        const isSelected = d.id === selectedDrawingId;

        if (d.type === 'horizontal_ray' && d.points.length >= 1) {
          const pt = toScreen(d.points[0]);
          if (!pt) return null;
          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
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
                strokeWidth={1}
              />
              <text
                x={width - 52}
                y={pt.y + 3.5}
                fill={d.color}
                fontSize={10}
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {d.points[0].price}
              </text>
            </g>
          );
        }

        if (d.type === 'trendline' && d.points.length >= 2) {
          const pt1 = toScreen(d.points[0]);
          const pt2 = toScreen(d.points[1]);
          if (!pt1 || !pt2) return null;

          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
              <line
                x1={pt1.x}
                y1={pt1.y}
                x2={pt2.x}
                y2={pt2.y}
                stroke={d.color}
                strokeWidth={isSelected ? 3 : 2}
              />
              {/* Endpoint handles */}
              <circle cx={pt1.x} cy={pt1.y} r={isSelected ? 5 : 3.5} fill={d.color} />
              <circle cx={pt2.x} cy={pt2.y} r={isSelected ? 5 : 3.5} fill={d.color} />
            </g>
          );
        }

        if (d.type === 'rectangle' && d.points.length >= 2) {
          const pt1 = toScreen(d.points[0]);
          const pt2 = toScreen(d.points[1]);
          if (!pt1 || !pt2) return null;

          const x = Math.min(pt1.x, pt2.x);
          const y = Math.min(pt1.y, pt2.y);
          const rectW = Math.abs(pt2.x - pt1.x);
          const rectH = Math.abs(pt2.y - pt1.y);

          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
              <rect
                x={x}
                y={y}
                width={rectW}
                height={rectH}
                fill="rgba(139, 92, 246, 0.16)"
                stroke={d.color}
                strokeWidth={isSelected ? 2 : 1.5}
                rx={2}
              />
            </g>
          );
        }

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

          const boxWidth = 140;
          const boxLeft = Math.max(10, pt.x - 30);

          // Target Box
          const targetY = isLong ? tpY : entryY;
          const targetH = Math.abs(tpY - entryY);

          // Risk Box
          const riskY = isLong ? entryY : slY;
          const riskH = Math.abs(slY - entryY);

          const riskDist = Math.abs(entryPrice - slPrice);
          const targetDist = Math.abs(tpPrice - entryPrice);
          const rr = riskDist > 0 ? (targetDist / riskDist).toFixed(2) : '0';

          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
            >
              {/* Target Green Zone */}
              <rect
                x={boxLeft}
                y={targetY}
                width={boxWidth}
                height={Math.max(4, targetH)}
                fill="rgba(16, 185, 129, 0.22)"
                stroke="#10b981"
                strokeWidth={1.5}
              />
              <text
                x={boxLeft + 8}
                y={targetY + 16}
                fill="#34d399"
                fontSize={10}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                TP: {tpPrice} (R:R {rr})
              </text>

              {/* Risk Red Zone */}
              <rect
                x={boxLeft}
                y={riskY}
                width={boxWidth}
                height={Math.max(4, riskH)}
                fill="rgba(244, 63, 94, 0.22)"
                stroke="#f43f5e"
                strokeWidth={1.5}
              />
              <text
                x={boxLeft + 8}
                y={riskY + Math.min(riskH - 6, 20)}
                fill="#fb7185"
                fontSize={10}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                SL: {slPrice}
              </text>

              {/* Entry Line */}
              <line
                x1={boxLeft}
                y1={entryY}
                x2={boxLeft + boxWidth}
                y2={entryY}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
              <text
                x={boxLeft + 8}
                y={entryY - 4}
                fill="#cbd5e1"
                fontSize={9}
                fontFamily="sans-serif"
              >
                Entry: {entryPrice}
              </text>
            </g>
          );
        }

        if (d.type === 'measure' && d.points.length >= 2) {
          const pt1 = toScreen(d.points[0]);
          const pt2 = toScreen(d.points[1]);
          if (!pt1 || !pt2) return null;

          const pDiff = Math.abs(d.points[1].price - d.points[0].price);
          const pPct = ((pDiff / d.points[0].price) * 100).toFixed(2);

          return (
            <g
              key={d.id}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawing(d.id);
              }}
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
