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
          fontSize: `${Math.max(6, Math.round(size * 0.42))}px`
        }}
      >
        {size >= 14 ? symbol.slice(0, 2).toUpperCase() : symbol.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={symbol}
      draggable={false}
      loading="eager"
      decoding="async"
      className="rounded-full object-cover shrink-0 select-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        boxShadow: size >= 16 ? '0 1px 2px rgba(0,0,0,0.25)' : 'none'
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

  // Full coin treemap layout remains stable so zooming expands into tiles in place
  const activeItems = useMemo(() => {
    return items;
  }, [items]);

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

  // Reset Zoom
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setFocusedCoin(null);
  }, []);

  // Handle Non-Passive Mouse Wheel Zoom Centered on Cursor (TradingView style)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      if (cursorX < 0 || cursorX > rect.width || cursorY < 0 || cursorY > rect.height) {
        return;
      }

      // Smooth zoom factor calculation
      let zoomFactor: number;
      if (e.ctrlKey) {
        // Trackpad pinch-to-zoom
        zoomFactor = Math.exp(-e.deltaY * 0.01);
      } else {
        // Standard mouse wheel
        const clampedDelta = Math.max(-120, Math.min(120, e.deltaY));
        zoomFactor = Math.pow(1.0025, -clampedDelta);
      }

      setZoomLevel(prevZoom => {
        let newZoom = prevZoom * zoomFactor;

        // Strictly enforce minimum zoom at 100% (1.0) and maximum at 800% (8.0)
        if (newZoom <= 1.01) {
          setPanOffset({ x: 0, y: 0 });
          setFocusedCoin(null);
          return 1;
        }

        newZoom = Math.min(8, newZoom);

        setPanOffset(prevPan => {
          // Point in unscaled canvas coordinates currently under cursor
          const canvasX = (cursorX - prevPan.x) / prevZoom;
          const canvasY = (cursorY - prevPan.y) / prevZoom;

          // Keep that exact point under the cursor at newZoom
          let nextPanX = cursorX - canvasX * newZoom;
          let nextPanY = cursorY - canvasY * newZoom;

          // Strictly clamp so heatmap edges never pull away from container edges (no blank gaps)
          const minPanX = rect.width - rect.width * newZoom;
          const minPanY = rect.height - rect.height * newZoom;

          nextPanX = Math.min(0, Math.max(minPanX, nextPanX));
          nextPanY = Math.min(0, Math.max(minPanY, nextPanY));

          return { x: nextPanX, y: nextPanY };
        });

        return newZoom;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [dimensions]);

  // Handle Pan Click & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (zoomLevel > 1) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoomLevel > 1) {
      const minPanX = dimensions.width - dimensions.width * zoomLevel;
      const minPanY = dimensions.height - dimensions.height * zoomLevel;
      const rawPanX = e.clientX - dragStart.x;
      const rawPanY = e.clientY - dragStart.y;
      setPanOffset({
        x: Math.min(0, Math.max(minPanX, rawPanX)),
        y: Math.min(0, Math.max(minPanY, rawPanY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Zoom into specific coin on click
  const handleCoinClick = (item: HeatmapItem, rect: TreemapRect<HeatmapItem>) => {
    setActiveCoinId(item.id);
    onHoverItem(item);

    if (zoomLevel < 1.8) {
      setFocusedCoin(item);
      const targetZoom = 2.6;
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      let nextPanX = dimensions.width / 2 - centerX * targetZoom;
      let nextPanY = dimensions.height / 2 - centerY * targetZoom;

      const minPanX = dimensions.width - dimensions.width * targetZoom;
      const minPanY = dimensions.height - dimensions.height * targetZoom;

      nextPanX = Math.min(0, Math.max(minPanX, nextPanX));
      nextPanY = Math.min(0, Math.max(minPanY, nextPanY));

      setZoomLevel(targetZoom);
      setPanOffset({ x: nextPanX, y: nextPanY });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-[#131722] select-none"
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
      {focusedCoin && zoomLevel > 1 && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-white/95 dark:bg-[#1e222d]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white shadow-lg animate-in fade-in">
          <button
            onClick={resetZoom}
            className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Reset Zoom</span>
          </button>
          <span className="text-slate-400 dark:text-slate-500">/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {focusedCoin.name} ({focusedCoin.displaySymbol})
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
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-white/95 dark:bg-[#1e222d]/85 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white shadow-lg">
        <button
          onClick={() => {
            const centerX = dimensions.width / 2;
            const centerY = dimensions.height / 2;
            const nextZoom = Math.min(8, +(zoomLevel * 1.3).toFixed(2));
            const canvasX = (centerX - panOffset.x) / zoomLevel;
            const canvasY = (centerY - panOffset.y) / zoomLevel;
            let nextPanX = centerX - canvasX * nextZoom;
            let nextPanY = centerY - canvasY * nextZoom;
            const minPanX = dimensions.width - dimensions.width * nextZoom;
            const minPanY = dimensions.height - dimensions.height * nextZoom;
            nextPanX = Math.min(0, Math.max(minPanX, nextPanX));
            nextPanY = Math.min(0, Math.max(minPanY, nextPanY));
            setZoomLevel(nextZoom);
            setPanOffset({ x: nextPanX, y: nextPanY });
          }}
          disabled={zoomLevel >= 8}
          className={`p-1 rounded transition-colors ${
            zoomLevel >= 8
              ? 'opacity-30 cursor-not-allowed text-slate-400'
              : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 min-w-[34px] text-center select-none">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => {
            if (zoomLevel <= 1.01) return;
            const nextZoom = Math.max(1, +(zoomLevel / 1.3).toFixed(2));
            if (nextZoom <= 1.01) {
              resetZoom();
              return;
            }
            const centerX = dimensions.width / 2;
            const centerY = dimensions.height / 2;
            const canvasX = (centerX - panOffset.x) / zoomLevel;
            const canvasY = (centerY - panOffset.y) / zoomLevel;
            let nextPanX = centerX - canvasX * nextZoom;
            let nextPanY = centerY - canvasY * nextZoom;
            const minPanX = dimensions.width - dimensions.width * nextZoom;
            const minPanY = dimensions.height - dimensions.height * nextZoom;
            nextPanX = Math.min(0, Math.max(minPanX, nextPanX));
            nextPanY = Math.min(0, Math.max(minPanY, nextPanY));
            setZoomLevel(nextZoom);
            setPanOffset({ x: nextPanX, y: nextPanY });
          }}
          disabled={zoomLevel <= 1}
          className={`p-1 rounded transition-colors ${
            zoomLevel <= 1
              ? 'opacity-30 cursor-not-allowed text-slate-400'
              : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        {(zoomLevel > 1 || focusedCoin) && (
          <button
            onClick={resetZoom}
            className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors ml-0.5"
            title="Reset Zoom (100%)"
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

          const minDim = Math.min(cardW, cardH);

          // Level-of-Detail (LOD) based on true card pixel dimensions:
          // 1. Extra Large: cardW >= 170 && cardH >= 115 (Deep zoom or Bitcoin/Ethereum at 1x)
          // 2. Large: cardW >= 115 && cardH >= 75 (Image 2 style: big logo, full name, return, price)
          // 3. Medium: cardW >= 68 && cardH >= 52 (Image 1 style: logo, truncated name, return)
          // 4. Compact: cardW >= 46 && cardH >= 38 (logo, symbol, return)
          // 5. Micro: minDim >= 18 (Image 3 style: neat centered logo with comfortable padding)
          // 6. Nano: minDim < 18 (Clean colored tile, no logo clutter, tooltip on hover)

          const isExtraLarge = cardW >= 170 && cardH >= 115;
          const isLarge = !isExtraLarge && cardW >= 115 && cardH >= 75;
          const isMedium = !isExtraLarge && !isLarge && cardW >= 68 && cardH >= 52;
          const isCompact = !isExtraLarge && !isLarge && !isMedium && cardW >= 46 && cardH >= 38;
          const isMicro = !isExtraLarge && !isLarge && !isMedium && !isCompact && minDim >= 18;

          // Dynamic Logo Sizes scaling proportionally with true card dimensions:
          // When zooming out or on small cards, logos scale down neatly with comfortable padding.
          // When zooming in, logos scale up to their actual full crisp size (up to 64px).
          const logoSize = isExtraLarge
            ? Math.max(38, Math.min(Math.round(minDim * 0.26), 64))
            : isLarge
            ? Math.max(26, Math.min(Math.round(minDim * 0.26), 46))
            : isMedium
            ? Math.max(18, Math.min(Math.round(minDim * 0.25), 32))
            : isCompact
            ? Math.max(14, Math.min(Math.round(minDim * 0.26), 20))
            : Math.max(10, Math.min(Math.round(minDim * 0.46), 22));

          // Dynamic typography scaling based on minimum dimension to avoid vertical overflows
          const nameFontSize = isExtraLarge
            ? Math.max(14, Math.min(20, Math.round(minDim * 0.10)))
            : isLarge
            ? Math.max(12, Math.min(16, Math.round(minDim * 0.12)))
            : isMedium
            ? Math.max(10, Math.min(13, Math.round(minDim * 0.14)))
            : Math.max(9, Math.min(11, Math.round(minDim * 0.15)));

          const returnFontSize = isExtraLarge
            ? Math.max(16, Math.min(24, Math.round(minDim * 0.12)))
            : isLarge
            ? Math.max(13, Math.min(18, Math.round(minDim * 0.14)))
            : isMedium
            ? Math.max(11, Math.min(14, Math.round(minDim * 0.16)))
            : Math.max(9, Math.min(11, Math.round(minDim * 0.16)));

          const priceFontSize = Math.max(10, Math.min(14, Math.round(minDim * 0.09)));
          const textShadowStyle = text === '#ffffff' ? '0 1px 2px rgba(0,0,0,0.65)' : 'none';

          return (
            <div
              key={rect.id}
              className={`absolute overflow-hidden cursor-pointer transition-colors pointer-events-auto select-none ${
                isActive
                  ? 'ring-2 ring-[#2962ff] z-20 shadow-xl'
                  : 'border-[0.5px] border-white/40 dark:border-black/40'
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
              <div className={`w-full h-full flex flex-col items-center justify-center text-center overflow-hidden ${
                isExtraLarge || isLarge ? 'p-1.5' : isMedium ? 'p-1' : isCompact ? 'p-0.5' : 'p-0'
              }`}>
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
                      className="font-bold leading-none font-['Arial',sans-serif] mt-0.5 max-w-full truncate"
                      style={{ fontSize: `${nameFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {item.symbol}
                    </span>
                    <span
                      className="font-extrabold leading-none font-['Arial',sans-serif] mt-0.5"
                      style={{ fontSize: `${returnFontSize}px`, textShadow: textShadowStyle }}
                    >
                      {isPositive ? `+${metricChange.toFixed(1)}%` : `${metricChange.toFixed(1)}%`}
                    </span>
                  </>
                )}

                {/* 5. Micro Cards (Image 3 style): Centered Coin Logo Only */}
                {isMicro && (
                  <div
                    className="w-full h-full flex items-center justify-center p-0"
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
