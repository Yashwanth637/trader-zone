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
    if (symbolUpper === 'AILEY') return 'bg-[#e0009c] text-white';
    if (symbolUpper === 'META') return 'bg-[#f87171] text-white';
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
      className="rounded-full object-cover shrink-0 shadow-sm ring-1 ring-black/10 dark:ring-white/20 select-none"
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

  // Active / Selected Coin State
  const [activeCoinId, setActiveCoinId] = useState<string | null>(null);
  const [hoveredCoinId, setHoveredCoinId] = useState<string | null>(null);
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

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(8, Math.max(1, zoomLevel * zoomFactor));

    if (newZoom <= 1.02) {
      setPanOffset({ x: 0, y: 0 });
      setZoomLevel(1);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Fixed point in unscaled canvas coordinates:
    const canvasX = (cursorX - panOffset.x) / zoomLevel;
    const canvasY = (cursorY - panOffset.y) / zoomLevel;

    // After zooming, keep that point at the cursor:
    const newPanX = cursorX - canvasX * newZoom;
    const newPanY = cursorY - canvasY * newZoom;

    // Prevent excessive panning off-canvas
    const minPanX = dimensions.width - dimensions.width * newZoom;
    const minPanY = dimensions.height - dimensions.height * newZoom;

    setZoomLevel(newZoom);
    setPanOffset({
      x: Math.min(80, Math.max(minPanX - 80, newPanX)),
      y: Math.min(80, Math.max(minPanY - 80, newPanY))
    });
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
      const minPanX = dimensions.width - dimensions.width * zoomLevel;
      const minPanY = dimensions.height - dimensions.height * zoomLevel;
      const newPanX = e.clientX - dragStart.x;
      const newPanY = e.clientY - dragStart.y;
      setPanOffset({
        x: Math.min(100, Math.max(minPanX - 100, newPanX)),
        y: Math.min(100, Math.max(minPanY - 100, newPanY))
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

  // Zoom into specific coin on click
  const handleCoinClick = (item: HeatmapItem, rect: TreemapRect<HeatmapItem>) => {
    setActiveCoinId(item.id);
    onHoverItem(item);

    if (zoomLevel < 1.8) {
      setFocusedCoin(item);
      const targetZoom = 3.2;
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      setZoomLevel(targetZoom);
      setPanOffset({
        x: dimensions.width / 2 - centerX * targetZoom,
        y: dimensions.height / 2 - centerY * targetZoom
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-[#131722] select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        onHoverItem(null);
        setHoveredCoinId(null);
      }}
      style={{
        cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
      }}
    >
      {/* Zoom / Drill-down Status Breadcrumb Banner */}
      {focusedCoin && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-white/95 dark:bg-[#1e222d]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white shadow-lg animate-in fade-in">
          <button
            onClick={resetZoom}
            className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Coins</span>
          </button>
          <span className="text-slate-400 dark:text-slate-500">/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {focusedCoin.name} ({focusedCoin.category})
          </span>
          <button
            onClick={resetZoom}
            className="ml-2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating Zoom Action Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-white/95 dark:bg-[#1e222d]/85 backdrop-blur-md p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white shadow-lg">
        <button
          onClick={() => setZoomLevel(prev => Math.min(8, prev + 0.6))}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.6))}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        {(zoomLevel > 1 || focusedCoin) && (
          <button
            onClick={resetZoom}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Direct-Rendered Canvas Tiles with Dynamic Size Expansion on Zoom */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {treemapRects.map(rect => {
          const item = rect.data;

          // Compute true visual screen coordinates and dimensions
          const cardX = rect.x * zoomLevel + panOffset.x;
          const cardY = rect.y * zoomLevel + panOffset.y;
          const cardW = rect.width * zoomLevel;
          const cardH = rect.height * zoomLevel;

          // Viewport Culling: Skip tiles completely off-screen for maximum 60fps performance
          if (
            cardX + cardW < -15 ||
            cardX > dimensions.width + 15 ||
            cardY + cardH < -15 ||
            cardY > dimensions.height + 15
          ) {
            return null;
          }

          const metricChange =
            colorBy === 'change1h' && item.change1h !== undefined
              ? item.change1h
              : colorBy === 'change7d' && item.change7d !== undefined
              ? item.change7d
              : item.change24h;

          const { bg, text } = getHeatmapTileColor(metricChange, isDark);
          const isPositive = metricChange >= 0;
          const isActive = item.id === activeCoinId || item.id === hoveredCoinId;

          // Level-of-Detail (LOD) based on true card pixel dimensions:
          // 1. Extra Large: cardW >= 180 && cardH >= 120 (Bitcoin unzoomed, or deeply zoomed coins)
          // 2. Large: cardW >= 120 && cardH >= 80 (Image 2 style: big logo, full untruncated name, price)
          // 3. Medium: cardW >= 78 && cardH >= 56 (Image 1 style: logo, truncated name, percentage return)
          // 4. Compact: cardW >= 46 && cardH >= 40 (small logo, symbol, return)
          // 5. Micro: cardW < 46 || cardH < 40 (Image 3 style: centered coin logo only)

          const isExtraLarge = cardW >= 180 && cardH >= 120;
          const isLarge = !isExtraLarge && cardW >= 120 && cardH >= 80;
          const isMedium = !isExtraLarge && !isLarge && cardW >= 78 && cardH >= 56;
          const isCompact = !isExtraLarge && !isLarge && !isMedium && cardW >= 46 && cardH >= 40;
          const isMicro = !isExtraLarge && !isLarge && !isMedium && !isCompact && cardW >= 16 && cardH >= 16;

          // Dynamic Logo Sizes scaling proportionally with true card dimensions
          const logoSize = isExtraLarge
            ? Math.max(48, Math.min(Math.round(cardW * 0.28), Math.round(cardH * 0.28), 68))
            : isLarge
            ? Math.max(34, Math.min(Math.round(cardW * 0.32), Math.round(cardH * 0.28), 54))
            : isMedium
            ? Math.max(24, Math.min(Math.round(cardW * 0.34), Math.round(cardH * 0.32), 38))
            : isCompact
            ? Math.max(16, Math.min(Math.round(cardW * 0.34), Math.round(cardH * 0.32), 26))
            : Math.max(14, Math.min(Math.round(cardW * 0.72), Math.round(cardH * 0.72), 28));

          // Dynamic typography scaling based on card pixel width
          const nameFontSize = isExtraLarge
            ? Math.max(15, Math.min(20, Math.round(cardW * 0.08)))
            : isLarge
            ? Math.max(13, Math.min(16, Math.round(cardW * 0.10)))
            : isMedium
            ? Math.max(11, Math.min(14, Math.round(cardW * 0.12)))
            : Math.max(9, Math.min(12, Math.round(cardW * 0.14)));

          const returnFontSize = isExtraLarge
            ? Math.max(18, Math.min(26, Math.round(cardW * 0.11)))
            : isLarge
            ? Math.max(15, Math.min(20, Math.round(cardW * 0.12)))
            : isMedium
            ? Math.max(12, Math.min(16, Math.round(cardW * 0.13)))
            : Math.max(10, Math.min(12, Math.round(cardW * 0.14)));

          const priceFontSize = Math.max(10, Math.min(15, Math.round(cardW * 0.085)));
          const textShadowStyle = text === '#ffffff' ? '0 1px 2px rgba(0,0,0,0.65)' : 'none';

          return (
            <div
              key={rect.id}
              className={`absolute overflow-hidden cursor-pointer transition-colors pointer-events-auto select-none ${
                isActive
                  ? 'ring-2 ring-[#2962ff] z-20 shadow-xl'
                  : 'border-[1.5px] border-white/95 dark:border-white/80'
              } hover:brightness-110 active:brightness-95`}
              style={{
                left: `${cardX}px`,
                top: `${cardY}px`,
                width: `${cardW}px`,
                height: `${cardH}px`,
                backgroundColor: bg,
                color: text
              }}
              onMouseEnter={(e) => {
                setHoveredCoinId(item.id);
                onHoverItem(item, { x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                onHoverItem(item, { x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => {
                setHoveredCoinId(null);
              }}
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
              <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center overflow-hidden">
                {/* 1. Extra Large Cards: Big Logo, Full Name, Large Return, Price, Market Cap */}
                {isExtraLarge && (
                  <>
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={logoSize}
                    />
                    <span
                      className="font-bold leading-tight mt-1 max-w-full truncate px-1 font-['Arial',sans-serif]"
                      style={{ fontSize: `${nameFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="font-extrabold tracking-wide mt-0.5 font-['Arial',sans-serif]"
                      style={{ fontSize: `${returnFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {isPositive ? `+${metricChange.toFixed(2)}%` : `${metricChange.toFixed(2)}%`}
                    </span>
                    <span
                      className="font-bold mt-0.5 font-['Arial',sans-serif]"
                      style={{ fontSize: `${priceFontSize}px`, textShadow: textShadowStyle }}
                    >
                      ${formatHeatmapPrice(item.price)}
                    </span>
                  </>
                )}

                {/* 2. Large Cards (Image 2 style): Logo, Full Name, Return, Price */}
                {isLarge && (
                  <>
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={logoSize}
                    />
                    <span
                      className="font-bold leading-tight mt-1 max-w-full truncate px-1 font-['Arial',sans-serif]"
                      style={{ fontSize: `${nameFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="font-extrabold tracking-wide mt-0.5 font-['Arial',sans-serif]"
                      style={{ fontSize: `${returnFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {isPositive ? `+${metricChange.toFixed(2)}%` : `${metricChange.toFixed(2)}%`}
                    </span>
                    {cardH >= 105 && (
                      <span
                        className="font-bold mt-0.5 font-['Arial',sans-serif]"
                        style={{ fontSize: `${priceFontSize}px`, textShadow: textShadowStyle }}
                      >
                        ${formatHeatmapPrice(item.price)}
                      </span>
                    )}
                  </>
                )}

                {/* 3. Medium Cards (Image 1 style): Logo, Truncated Name, Return */}
                {isMedium && (
                  <>
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={logoSize}
                    />
                    <span
                      className="font-bold leading-tight truncate max-w-full px-0.5 font-['Arial',sans-serif] mt-0.5"
                      style={{ fontSize: `${nameFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="font-extrabold tracking-wide font-['Arial',sans-serif] mt-0.5"
                      style={{ fontSize: `${returnFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {isPositive ? `+${metricChange.toFixed(2)}%` : `${metricChange.toFixed(2)}%`}
                    </span>
                    {cardH >= 85 && (
                      <span
                        className="font-bold mt-0.5 font-['Arial',sans-serif]"
                        style={{ fontSize: `${priceFontSize}px`, textShadow: textShadowStyle }}
                      >
                        ${formatHeatmapPrice(item.price)}
                      </span>
                    )}
                  </>
                )}

                {/* 4. Compact Cards: Small Logo, Symbol, Return */}
                {isCompact && (
                  <>
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={logoSize}
                    />
                    <span
                      className="font-bold leading-tight font-['Arial',sans-serif] mt-0.5 max-w-full truncate"
                      style={{ fontSize: `${nameFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {item.symbol}
                    </span>
                    <span
                      className="font-extrabold font-['Arial',sans-serif]"
                      style={{ fontSize: `${returnFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {isPositive ? `+${metricChange.toFixed(1)}%` : `${metricChange.toFixed(1)}%`}
                    </span>
                  </>
                )}

                {/* 5. Micro Cards (Image 3 style): Centered Coin Logo Only */}
                {isMicro && (
                  <div
                    className="w-full h-full flex items-center justify-center p-0.5"
                    title={`${item.name} (${item.displaySymbol}): ${isPositive ? '+' : ''}${metricChange.toFixed(2)}%`}
                  >
                    <CoinLogo
                      logoUrl={item.logoUrl}
                      name={item.name}
                      symbol={item.symbol}
                      size={logoSize}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
