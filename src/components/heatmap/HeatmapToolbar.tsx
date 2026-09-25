import React, { useState } from 'react';
import {
  Camera,
  Maximize2,
  Minimize2,
  RefreshCw,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';

export type MarketTypeFilter = 'all' | 'crypto' | 'gold';
export type CategoryFilter = 'All' | 'Layer 1' | 'DeFi' | 'Stablecoin' | 'Meme' | 'Gold & Metals' | 'Infrastructure';
export type SizeByOption = 'marketCap' | 'volume24h';
export type ColorByOption = 'change24h' | 'change1h' | 'change7d';

interface HeatmapToolbarProps {
  marketType: MarketTypeFilter;
  onMarketTypeChange: (type: MarketTypeFilter) => void;
  selectedCategory: CategoryFilter;
  onCategoryChange: (cat: CategoryFilter) => void;
  sizeBy: SizeByOption;
  onSizeByChange: (val: SizeByOption) => void;
  colorBy: ColorByOption;
  onColorByChange: (val: ColorByOption) => void;
  onSnapshot: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const HeatmapToolbar: React.FC<HeatmapToolbarProps> = ({
  marketType,
  onMarketTypeChange,
  selectedCategory,
  onCategoryChange,
  sizeBy,
  onSizeByChange,
  colorBy,
  onColorByChange,
  onSnapshot,
  onRefresh,
  isRefreshing,
  isFullscreen,
  onToggleFullscreen
}) => {
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);

  const marketLabels: Record<MarketTypeFilter, string> = {
    crypto: 'Crypto Coins Heatmap',
    gold: 'Gold & Metals Heatmap',
    all: 'All Markets (Crypto + Gold)'
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border/40 dark:border-white/[0.08] rounded-2xl shadow-sm select-none">
      {/* Left: Main Market Title & Switcher Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowMarketDropdown(!showMarketDropdown)}
          className="flex items-center gap-2 text-base md:text-lg font-bold text-foreground hover:text-primary transition-colors font-['Arial',sans-serif] px-2 py-1 rounded-lg hover:bg-surface-hover"
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>{marketLabels[marketType]}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-0.5" />
        </button>

        {showMarketDropdown && (
          <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl bg-surface border border-border shadow-xl z-50 py-1.5 backdrop-blur-md">
            <button
              onClick={() => {
                onMarketTypeChange('crypto');
                setShowMarketDropdown(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm font-medium hover:bg-surface-hover flex items-center justify-between ${
                marketType === 'crypto' ? 'text-primary font-bold bg-primary/10' : 'text-foreground'
              }`}
            >
              <span>Crypto Coins Heatmap</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">100+</span>
            </button>

            <button
              onClick={() => {
                onMarketTypeChange('gold');
                setShowMarketDropdown(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm font-medium hover:bg-surface-hover flex items-center justify-between ${
                marketType === 'gold' ? 'text-primary font-bold bg-primary/10' : 'text-foreground'
              }`}
            >
              <span>Gold & Metals Heatmap</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">Gold</span>
            </button>

            <button
              onClick={() => {
                onMarketTypeChange('all');
                setShowMarketDropdown(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm font-medium hover:bg-surface-hover flex items-center justify-between ${
                marketType === 'all' ? 'text-primary font-bold bg-primary/10' : 'text-foreground'
              }`}
            >
              <span>All Markets (Crypto + Gold)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Combined</span>
            </button>
          </div>
        )}
      </div>

      {/* Middle & Right Controls: Category, Size, Color & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Pills / Dropdown */}
        <div className="flex items-center gap-1 bg-surface-hover/70 p-1 rounded-xl border border-border/40">
          <Layers className="w-3.5 h-3.5 text-muted-foreground ml-1 mr-0.5" />
          {(['All', 'Layer 1', 'DeFi', 'Stablecoin', 'Meme', 'Gold & Metals'] as CategoryFilter[]).map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all font-['Arial',sans-serif] ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Size By Dropdown */}
        <div className="flex items-center gap-1.5 bg-surface-hover/70 px-3 py-1.5 rounded-xl border border-border/40 text-xs font-medium">
          <span className="text-muted-foreground font-['Arial',sans-serif]">Size:</span>
          <select
            value={sizeBy}
            onChange={(e) => onSizeByChange(e.target.value as SizeByOption)}
            className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer font-['Arial',sans-serif]"
          >
            <option value="marketCap" className="bg-surface text-foreground">Market cap</option>
            <option value="volume24h" className="bg-surface text-foreground">Volume 24h</option>
          </select>
        </div>

        {/* Color By Dropdown */}
        <div className="flex items-center gap-1.5 bg-surface-hover/70 px-3 py-1.5 rounded-xl border border-border/40 text-xs font-medium">
          <span className="text-muted-foreground font-['Arial',sans-serif]">Color:</span>
          <select
            value={colorBy}
            onChange={(e) => onColorByChange(e.target.value as ColorByOption)}
            className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer font-['Arial',sans-serif]"
          >
            <option value="change24h" className="bg-surface text-foreground">Change 24h, %</option>
            <option value="change1h" className="bg-surface text-foreground">Change 1h, %</option>
            <option value="change7d" className="bg-surface text-foreground">Change 7d, %</option>
          </select>
        </div>

        {/* Action Buttons: Refresh, Snapshot, Fullscreen */}
        <div className="flex items-center gap-1 ml-1">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-surface-hover rounded-xl text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh Market Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Snapshot Button */}
          <button
            onClick={onSnapshot}
            className="p-2 hover:bg-surface-hover rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            title="Export / Download Heatmap Image"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 hover:bg-surface-hover rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
