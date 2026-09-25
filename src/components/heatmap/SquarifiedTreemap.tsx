import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { HeatmapItem } from '../../lib/heatmapDataService';
import { squarify, TreemapNode, TreemapRect } from '../../lib/squarifyTreemap';
import { getHeatmapTileColor, formatHeatmapPrice } from '../../lib/heatmapColors';
import { useTheme } from '../../context/ThemeContext';
import { ZoomIn, ZoomOut, RotateCcw, ArrowLeft } from 'lucide-react';

interface SquarifiedTreemapProps {
  items: HeatmapItem[];
  sizeBy: 'marketCap' | 'volume24h';
  colorBy: 'change24h' | 'change1h' | 'change7d';
  onHoverItem: (item: HeatmapItem | null, pos?: { x: number; y: number } | null) => void;
  onSelectItem?: (item: HeatmapItem) => void;
}

export const SquarifiedTreemap: React.FC<SquarifiedTreemapProps> = ({
  items,
  sizeBy,
  colorBy,
  onHoverItem,
  onSelectItem
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });

  // Canvas Pan & Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Focused Coin / Category Zoom State
  const [focusedCoin, setFocusedCoin] = useState<HeatmapItem | null>(null);

  // Resize Observer for responsive canvas dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({
            width: clientWidth,
            height: Math.max(480, clientHeight)
          });
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Layout Items (filter by focused coin's category if drilled down)
  const activeItems = useMemo(() => {
    if (!focusedCoin) return items;
    // When focused on a coin, display that coin plus related coins in its ecosystem/category
    const related = items.filter(it => it.category === focusedCoin.category || it.id === focusedCoin.id);
    return related.length > 0 ? related : items;
  }, [items, focusedCoin]);

  // Compute Treemap Rectangles using Squarify Algorithm
  const treemapRects = useMemo<TreemapRect<HeatmapItem>[]>(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0 || activeItems.length === 0) {
      return [];
    }

    const nodes: TreemapNode<HeatmapItem>[] = activeItems.map(item => {
      let val = sizeBy === 'volume24h' ? item.volume24h : item.marketCap;
      if (!val || val <= 0) val = 1000;
      return {
        id: item.id,
        value: val,
        data: item
      };
    });

    return squarify<HeatmapItem>(nodes, {
      x: 0,
      y: 0,
      width: dimensions.width,
      height: dimensions.height
    });
  }, [activeItems, sizeBy, dimensions]);

  // Handle Mouse Wheel Zoom centered on cursor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(6, Math.max(1, zoomLevel * zoomFactor));

    if (newZoom === 1) {
      setPanOffset({ x: 0, y: 0 });
      setZoomLevel(1);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Adjust pan offset so zoom centers under cursor
    const newPanX = cursorX - (cursorX - panOffset.x) * (newZoom / zoomLevel);
    const newPanY = cursorY - (cursorY - panOffset.y) * (newZoom / zoomLevel);

    setZoomLevel(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  // Handle Pan Click & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (zoomLevel > 1) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Reset Zoom
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setFocusedCoin(null);
  }, []);

  // Zoom into specific coin
  const handleCoinClick = (item: HeatmapItem, rect: TreemapRect<HeatmapItem>) => {
    if (zoomLevel === 1 && !focusedCoin) {
      // Zoom into coin tile smoothly
      setFocusedCoin(item);
      const targetScale = Math.min(3, Math.max(1.8, dimensions.width / (rect.width * 1.5)));
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      setZoomLevel(targetScale);
      setPanOffset({
        x: dimensions.width / 2 - centerX * targetScale,
        y: dimensions.height / 2 - centerY * targetScale
      });
    } else {
      if (onSelectItem) onSelectItem(item);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-border/40 dark:border-white/[0.08] bg-[#131722] select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        onHoverItem(null);
      }}
    >
      {/* Zoom / Drill-down Status Breadcrumb Banner */}
      {focusedCoin && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#1e222d]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white shadow-lg animate-in fade-in">
          <button
            onClick={resetZoom}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Coins</span>
          </button>
          <span className="text-slate-500">/</span>
          <span className="font-semibold text-slate-200">
            {focusedCoin.name} ({focusedCoin.category})
          </span>
          <button
            onClick={resetZoom}
            className="ml-2 p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating Zoom Action Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-[#1e222d]/85 backdrop-blur-md p-1 rounded-lg border border-white/10 text-white shadow-lg">
        <button
          onClick={() => setZoomLevel(prev => Math.min(6, prev + 0.5))}
          className="p-1.5 hover:bg-white/10 rounded text-slate-300 hover:text-white transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))}
          className="p-1.5 hover:bg-white/10 rounded text-slate-300 hover:text-white transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        {(zoomLevel > 1 || focusedCoin) && (
          <button
            onClick={resetZoom}
            className="p-1.5 hover:bg-white/10 rounded text-slate-300 hover:text-white transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Transformable Canvas Layer */}
      <div
        className="w-full h-full transition-transform duration-100 ease-out origin-top-left"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
        }}
      >
        {treemapRects.map(rect => {
          const item = rect.data;
          const metricChange =
            colorBy === 'change1h' && item.change1h !== undefined
              ? item.change1h
              : colorBy === 'change7d' && item.change7d !== undefined
              ? item.change7d
              : item.change24h;

          const { bg, text } = getHeatmapTileColor(metricChange, isDark);

          // Tile sizing classifications
          const isLarge = rect.width >= 120 && rect.height >= 85;
          const isMedium = rect.width >= 75 && rect.height >= 55;
          const isSmall = rect.width >= 45 && rect.height >= 35;
          const isMicro = rect.width < 45 || rect.height < 35;

          const isPositive = metricChange >= 0;

          return (
            <div
              key={rect.id}
              className="absolute overflow-hidden transition-colors border border-black/40 dark:border-black/50 cursor-pointer group hover:brightness-110 active:brightness-95"
              style={{
                left: `${rect.x}px`,
                top: `${rect.y}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                backgroundColor: bg,
                color: text
              }}
              onMouseEnter={(e) => onHoverItem(item, { x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => onHoverItem(item, { x: e.clientX, y: e.clientY })}
              onClick={(e) => {
                e.stopPropagation();
                handleCoinClick(item, rect);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onSelectItem) onSelectItem(item);
              }}
            >
              {/* Tile Content Layout */}
              <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center select-none">
                {isLarge && (
                  <>
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded-full object-cover mb-1.5 shadow-md ring-1 ring-white/20"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center font-bold text-sm mb-1.5">
                        {item.symbol.slice(0, 3)}
                      </div>
                    )}
                    <span className="font-bold text-base leading-tight tracking-tight drop-shadow-sm font-['Arial',sans-serif]">
                      {item.name}
                    </span>
                    <span className="font-extrabold text-lg mt-0.5 tracking-wide drop-shadow font-['Arial',sans-serif]">
                      {isPositive ? `+${metricChange.toFixed(2)}%` : `${metricChange.toFixed(2)}%`}
                    </span>
                    <span className="text-[11px] font-semibold opacity-90 mt-0.5 font-['Arial',sans-serif]">
                      ${formatHeatmapPrice(item.price)}
                    </span>
                  </>
                )}

                {isMedium && !isLarge && (
                  <>
                    {item.logoUrl && (
                      <img
                        src={item.logoUrl}
                        alt={item.name}
                        className="w-6 h-6 rounded-full object-cover mb-1 shadow-sm"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="font-bold text-xs leading-tight tracking-tight truncate max-w-full px-1 font-['Arial',sans-serif]">
                      {item.name.length > 12 ? item.symbol : item.name}
                    </span>
                    <span className="font-extrabold text-xs mt-0.5 font-['Arial',sans-serif]">
                      {isPositive ? `+${metricChange.toFixed(2)}%` : `${metricChange.toFixed(2)}%`}
                    </span>
                  </>
                )}

                {isSmall && !isMedium && (
                  <>
                    {item.logoUrl && rect.height > 40 && (
                      <img
                        src={item.logoUrl}
                        alt={item.name}
                        className="w-4 h-4 rounded-full object-cover mb-0.5"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="font-bold text-[10px] leading-tight font-['Arial',sans-serif]">
                      {item.symbol}
                    </span>
                    <span className="font-bold text-[9px] font-['Arial',sans-serif]">
                      {isPositive ? `+${metricChange.toFixed(1)}%` : `${metricChange.toFixed(1)}%`}
                    </span>
                  </>
                )}

                {isMicro && (
                  <div
                    className="w-full h-full"
                    title={`${item.name} (${item.displaySymbol}): ${isPositive ? '+' : ''}${metricChange.toFixed(2)}%`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
