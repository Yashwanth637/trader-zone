import React, { useState, useEffect, useRef, useMemo } from 'react';
import { heatmapDataService, HeatmapItem } from '../lib/heatmapDataService';
import { SquarifiedTreemap } from '../components/heatmap/SquarifiedTreemap';
import {
  HeatmapToolbar,
  MarketTypeFilter,
  CategoryFilter,
  SizeByOption,
  ColorByOption
} from '../components/heatmap/HeatmapToolbar';
import { HeatmapHoverPill } from '../components/heatmap/HeatmapHoverPill';
import { HeatmapLegend } from '../components/heatmap/HeatmapLegend';
import { CoinDetailModal } from '../components/heatmap/CoinDetailModal';
import html2canvas from 'html2canvas';

export const MarketHeatmapPage: React.FC = () => {
  const [items, setItems] = useState<HeatmapItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketType, setMarketType] = useState<MarketTypeFilter>('crypto');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [sizeBy, setSizeBy] = useState<SizeByOption>('marketCap');
  const [colorBy, setColorBy] = useState<ColorByOption>('change24h');

  // Hover state for the live status bar pill (Image 2)
  const [hoveredItem, setHoveredItem] = useState<HeatmapItem | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Selected coin for deep-dive modal
  const [selectedCoin, setSelectedCoin] = useState<HeatmapItem | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to live market data stream
  useEffect(() => {
    const unsubscribe = heatmapDataService.subscribe((updatedItems) => {
      setItems(updatedItems);
    });

    return () => unsubscribe();
  }, []);

  // Filter items based on Market Type (Crypto, Gold, or All) and Category
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Market Type Filter
      if (marketType === 'crypto' && item.marketType !== 'crypto') return false;
      if (marketType === 'gold' && item.marketType !== 'gold') return false;

      // 2. Category Filter
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Gold & Metals' && item.marketType !== 'gold' && item.category !== 'Gold & Metals') {
          return false;
        }
        if (selectedCategory !== 'Gold & Metals' && item.category !== selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }, [items, marketType, selectedCategory]);

  // Active item shown in the bottom docked pill: hovered item, or fallback to leading item (e.g. Bitcoin or Gold)
  const activePillItem = hoveredItem || filteredItems[0] || null;

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await heatmapDataService.refreshMarketData();
    setIsRefreshing(false);
  };

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!heatmapContainerRef.current) return;

    if (!document.fullscreenElement) {
      heatmapContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.warn('Exit fullscreen error:', err);
      });
    }
  };

  // Listen to fullscreen exit via Esc
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Snapshot / Export PNG
  const handleSnapshot = async () => {
    if (!heatmapContainerRef.current) return;
    try {
      const canvas = await html2canvas(heatmapContainerRef.current, {
        backgroundColor: '#131722',
        scale: 2,
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `market_heatmap_${marketType}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to take heatmap snapshot:', err);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full h-[calc(100vh-80px)] p-2 md:p-4 select-none overflow-hidden">
      {/* Top Header & Toolbar Controls */}
      <HeatmapToolbar
        marketType={marketType}
        onMarketTypeChange={setMarketType}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sizeBy={sizeBy}
        onSizeByChange={setSizeBy}
        colorBy={colorBy}
        onColorByChange={setColorBy}
        onSnapshot={handleSnapshot}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Heatmap Canvas Area (Image 1) */}
      <div
        ref={heatmapContainerRef}
        className="relative flex-1 w-full min-h-[460px] rounded-2xl overflow-hidden shadow-xl border border-border/40 dark:border-white/[0.08] bg-[#131722]"
      >
        <SquarifiedTreemap
          items={filteredItems}
          sizeBy={sizeBy}
          colorBy={colorBy}
          onHoverItem={(item, pos) => {
            setHoveredItem(item);
            setCursorPos(pos || null);
          }}
          onSelectItem={(item) => setSelectedCoin(item)}
        />

        {/* Live Hover Status Bar / Floating Pill Dock (Image 2) */}
        {activePillItem && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-2xl">
            <HeatmapHoverPill
              item={activePillItem}
              cursorPos={cursorPos}
              floating={false}
            />
          </div>
        )}

        {/* Bottom Left: TradingView Color Scale Legend (Image 1) */}
        <div className="absolute bottom-3 left-3 z-20 bg-[#1e222d]/85 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-lg pointer-events-auto">
          <HeatmapLegend />
        </div>
      </div>

      {/* Coin Deep-Dive Detail Modal */}
      <CoinDetailModal
        item={selectedCoin}
        onClose={() => setSelectedCoin(null)}
      />
    </div>
  );
};
