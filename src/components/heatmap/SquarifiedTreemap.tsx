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

// High-res Coin Logo with Instant Fallback
const CoinLogo: React.FC<{
  logoUrl?: string;
  name: string;
  symbol: string;
  size: number;
}> = ({ logoUrl, symbol, size }) => {
  const [hasError, setHasError] = useState(false);

  const symbolUpper = symbol.toUpperCase();
  const getBadgeColor = () => {
    if (symbolUpper === 'BTC') return 'bg-[#f7931a] text-white';
    if (symbolUpper === 'ETH') return 'bg-[#627eea] text-white';
    if (symbolUpper === 'SOL') return 'bg-[#14f195] text-black';
    if (symbolUpper === 'BNB') return 'bg-[#f3ba2f] text-black';
    if (symbolUpper === 'XRP') return 'bg-[#23292f] text-white';
    if (symbolUpper === 'DOGE') return 'bg-[#c2a633] text-white';
    if (symbolUpper.includes('GOLD') || symbolUpper.includes('XAU') || symbolUpper.includes('PAXG') || symbolUpper.includes('XAUT')) {
      return 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black';
    }
    return 'bg-black/35 text-white ring-1 ring-white/20';
  };

  if (!logoUrl || hasError) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-black shrink-0 shadow-sm select-none ${getBadgeColor()}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize: `${Math.max(7, Math.round(size * 0.44))}px`
        }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={symbol}
      loading="eager"
      decoding="async"
      className="rounded-full object-cover shrink-0 shadow-sm ring-1 ring-black/25 dark:ring-white/20 select-none"
      style={{
        width: `${size}px`,
        height: `${size}px`
      }}
      onError={() => setHasError(true)}
    />
  );
};

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

    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
    const newZoom = Math.min(6, Math.max(1, zoomLevel * zoomFactor));

    if (newZoom === 1) {
      setPanOffset({ x: 0, y: 0 });
      setZoomLevel(1);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const newPanX = cursorX - (cursorX - panOffset.x) * (newZoom / zoomLevel);
    const newPanY = cursorY - (cursorY - panOffset.y) * (newZoom / zoomLevel);

    setZoomLevel(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  // Handle Pan Click & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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
    if (zoomLevel < 2) {
      setFocusedCoin(item);
      const targetZoom = 2.8;
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      setZoomLevel(targetZoom);
      setPanOffset({
        x: dimensions.width / 2 - centerX * targetZoom,
        y: dimensions.height / 2 - centerY * targetZoom
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

          // Effective visual size on screen accounts for zoomLevel
          const effW = rect.width * zoomLevel;
          const effH = rect.height * zoomLevel;

          const isLarge = effW >= 115 && effH >= 80;
          const isMedium = !isLarge && effW >= 70 && effH >= 50;
          const isSmall = !isLarge && !isMedium && effW >= 42 && effH >= 32;
          const isTinyWithLogo = !isLarge && !isMedium && !isSmall && effW >= 14 && effH >= 14;

          const isPositive = metricChange >= 0;

          // Adaptive logo sizes inside tile coordinate space
          const largeLogoSize = Math.max(18, Math.min(Math.round(rect.width * 0.35), Math.round(rect.height * 0.35), 36));
          const mediumLogoSize = Math.max(14, Math.min(Math.round(rect.width * 0.32), Math.round(rect.height * 0.32), 24));
          const smallLogoSize = Math.max(12, Math.min(Math.round(rect.width * 0.32), Math.round(rect.height * 0.32), 18));
          const tinyLogoSize = Math.max(10, Math.min(Math.round(rect.width * 0.72), Math.round(rect.height * 0.72), 20));

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
              <div className="w-full h-full flex flex-col items-center justify-center p-0.5 text-center select-none overflow-hidden">
                {/* 1. Large Tiles: Full Name, Logo, Return, Price */}
                {isLarge && (
                  <>
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={largeLogoSize}
                    />
                    <span className="font-bold text-base leading-tight tracking-tight drop-shadow-sm font-['Arial',sans-serif] mt-1 max-w-full truncate px-1">
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

                {/* 2. Medium Tiles: Logo, Name or Symbol, Return */}
                {isMedium && (
                  <>
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={mediumLogoSize}
                    />
                    <span className="font-bold text-xs leading-tight tracking-tight truncate max-w-full px-0.5 font-['Arial',sans-serif] mt-0.5">
                      {rect.width >= 85 ? item.name : item.symbol}
                    </span>
                    <span className="font-extrabold text-xs mt-0.5 font-['Arial',sans-serif]">
                      {isPositive ? `+${metricChange.toFixed(2)}%` : `${metricChange.toFixed(2)}%`}
                    </span>
                  </>
                )}

                {/* 3. Small Tiles: Logo, Symbol, Return */}
                {isSmall && (
                  <>
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={smallLogoSize}
                    />
                    <span className="font-bold text-[10px] leading-tight font-['Arial',sans-serif] mt-0.5 max-w-full truncate">
                      {item.symbol}
                    </span>
                    <span className="font-bold text-[9px] font-['Arial',sans-serif]">
                      {isPositive ? `+${metricChange.toFixed(1)}%` : `${metricChange.toFixed(1)}%`}
                    </span>
                  </>
                )}

                {/* 4. Tiny Tiles (Image 1 Dense Right-Grid): Centered Coin Logo */}
                {isTinyWithLogo && (
                  <div
                    className="w-full h-full flex items-center justify-center p-0.5"
                    title={`${item.name} (${item.displaySymbol}): ${isPositive ? '+' : ''}${metricChange.toFixed(2)}%`}
                  >
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={tinyLogoSize}
                    />
                  </div>
                )}

                {/* 5. Microscopic Tiles: Minimal Color Indicator */}
                {!isLarge && !isMedium && !isSmall && !isTinyWithLogo && (
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
